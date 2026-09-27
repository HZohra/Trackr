import crypto from "crypto";

import {
  getCalendarIntegrationInternal,
  markIntegrationSynced,
  markIntegrationError,
} from "../../model/calendarIntegrationModel.js";

import {
  getTrackrCalendarSources,
  getSyncMappings,
  upsertSyncMapping,
  deleteSyncMapping,
} from "../../model/calendarSyncModel.js";

import {
  createAuthorizedCalendarClient,
} from "./googleCalendarService.js";

import {
  decryptCalendarToken,
} from "./calendarTokenCrypto.js";


const TIME_ZONE = "America/Toronto";


const CATEGORY_NAMES = {
  1: "Assignment",
  2: "Quiz",
  3: "Exam",
  4: "Project",
  5: "Lab",
};


function promisifyModel(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(
      ...args,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );
  });
}


function contentHash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}


function mappingKey(
  sourceType,
  sourceId
) {
  return `${sourceType}:${sourceId}`;
}


function googleStatus(error) {
  return (
    error?.response?.status ??
    error?.code ??
    null
  );
}


function buildActivityGoogleEvent(activity) {
  const category =
    CATEGORY_NAMES[
      activity.activity_category_id
    ] ?? "Coursework";

  const descriptionParts = [
    "Synced from Trackr",
    `Course: ${activity.course_code}`,
    `Type: ${category}`,
  ];

  if (
    activity.grading_weight != null
  ) {
    descriptionParts.push(
      `Weight: ${activity.grading_weight}%`
    );
  }

  if (
    activity.status
  ) {
    descriptionParts.push(
      `Status: ${activity.status}`
    );
  }

  return {
    summary:
      `${activity.course_code} · ${activity.activity_name}`,

    description:
      descriptionParts.join("\n"),

    start: {
      dateTime:
        activity.start_datetime,

      timeZone:
        TIME_ZONE,
    },

    end: {
      dateTime:
        activity.end_datetime,

      timeZone:
        TIME_ZONE,
    },

    extendedProperties: {
      private: {
        trackrSourceType:
          "activity",

        trackrSourceId:
          String(
            activity.activity_id
          ),
      },
    },
  };
}


function buildCalendarEventGoogleEvent(event) {
  const base = {
    summary:
      event.title,

    description:
      "Synced from Trackr",

    extendedProperties: {
      private: {
        trackrSourceType:
          "calendar_event",

        trackrSourceId:
          String(
            event.event_id
          ),
      },
    },
  };


  // All-day event
  if (!event.event_time) {
    return {
      ...base,

      start: {
        date:
          event.event_date,
      },

      // Google all-day event end dates are exclusive.
      end: {
        date:
          event.next_date,
      },
    };
  }


  // Timed event
  return {
    ...base,

    start: {
      dateTime:
        event.start_datetime,

      timeZone:
        TIME_ZONE,
    },

    end: {
      dateTime:
        event.end_datetime,

      timeZone:
        TIME_ZONE,
    },
  };
}


async function insertGoogleEvent(
  calendar,
  calendarId,
  requestBody
) {
  const response =
    await calendar.events.insert({
      calendarId,
      requestBody,
    });

  if (!response.data?.id) {
    throw new Error(
      "Google Calendar did not return an event ID."
    );
  }

  return response.data.id;
}


async function updateOrRecreateGoogleEvent({
  calendar,
  calendarId,
  externalEventId,
  requestBody,
}) {
  try {
    await calendar.events.update({
      calendarId,
      eventId:
        externalEventId,
      requestBody,
    });

    return externalEventId;
  } catch (error) {
    const status =
      googleStatus(error);

    if (
      status !== 404 &&
      status !== 410
    ) {
      throw error;
    }

    // The Google event was manually removed.
    // Recreate it from Trackr.
    return insertGoogleEvent(
      calendar,
      calendarId,
      requestBody
    );
  }
}


async function removeGoogleEvent(
  calendar,
  calendarId,
  eventId
) {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error) {
    const status =
      googleStatus(error);

    // Already gone is effectively success.
    if (
      status === 404 ||
      status === 410
    ) {
      return;
    }

    throw error;
  }
}


export async function syncGoogleCalendarForUser(
  userId
) {
  const integration =
    await promisifyModel(
      getCalendarIntegrationInternal,
      userId,
      "google"
    );


  if (
    !integration ||
    integration.status !==
      "connected"
  ) {
    const error =
      new Error(
        "Google Calendar is not connected."
      );

    error.statusCode = 409;

    throw error;
  }


  if (
    !integration.external_calendar_id
  ) {
    throw new Error(
      "Google Calendar ID is missing."
    );
  }


  if (
    !integration.encrypted_refresh_token
  ) {
    throw new Error(
      "Google refresh token is missing."
    );
  }


  const refreshToken =
    decryptCalendarToken(
      integration
        .encrypted_refresh_token
    );


  const calendar =
    createAuthorizedCalendarClient(
      refreshToken
    );


  try {
    const [
      sources,
      mappings,
    ] = await Promise.all([
      promisifyModel(
        getTrackrCalendarSources,
        userId
      ),

      promisifyModel(
        getSyncMappings,
        integration.id
      ),
    ]);


    const mappingMap =
      new Map(
        mappings.map(
          (mapping) => [
            mappingKey(
              mapping.source_type,
              mapping.source_id
            ),
            mapping,
          ]
        )
      );


    const liveSourceKeys =
      new Set();


    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let deleted = 0;


    // =========================================================
    // ACTIVITIES
    // =========================================================

    for (
      const activity of
      sources.activities
    ) {
      const sourceType =
        "activity";

      const sourceId =
        String(
          activity.activity_id
        );

      const key =
        mappingKey(
          sourceType,
          sourceId
        );

      liveSourceKeys.add(key);


      const requestBody =
        buildActivityGoogleEvent(
          activity
        );

      const hash =
        contentHash(
          requestBody
        );

      const existing =
        mappingMap.get(key);


      if (
        existing &&
        existing.content_hash === hash
      ) {
        unchanged++;
        continue;
      }


      let externalEventId;


      if (existing) {
        externalEventId =
          await updateOrRecreateGoogleEvent({
            calendar,

            calendarId:
              integration
                .external_calendar_id,

            externalEventId:
              existing
                .external_event_id,

            requestBody,
          });

        updated++;
      } else {
        externalEventId =
          await insertGoogleEvent(
            calendar,

            integration
              .external_calendar_id,

            requestBody
          );

        created++;
      }


      await promisifyModel(
        upsertSyncMapping,
        {
          userId,

          integrationId:
            integration.id,

          sourceType,

          sourceId,

          externalEventId,

          contentHash:
            hash,
        }
      );
    }


    // =========================================================
    // CALENDAR-ONLY EVENTS
    // =========================================================

    for (
      const event of
      sources.events
    ) {
      const sourceType =
        "calendar_event";

      const sourceId =
        String(
          event.event_id
        );

      const key =
        mappingKey(
          sourceType,
          sourceId
        );

      liveSourceKeys.add(key);


      const requestBody =
        buildCalendarEventGoogleEvent(
          event
        );

      const hash =
        contentHash(
          requestBody
        );

      const existing =
        mappingMap.get(key);


      if (
        existing &&
        existing.content_hash === hash
      ) {
        unchanged++;
        continue;
      }


      let externalEventId;


      if (existing) {
        externalEventId =
          await updateOrRecreateGoogleEvent({
            calendar,

            calendarId:
              integration
                .external_calendar_id,

            externalEventId:
              existing
                .external_event_id,

            requestBody,
          });

        updated++;
      } else {
        externalEventId =
          await insertGoogleEvent(
            calendar,

            integration
              .external_calendar_id,

            requestBody
          );

        created++;
      }


      await promisifyModel(
        upsertSyncMapping,
        {
          userId,

          integrationId:
            integration.id,

          sourceType,

          sourceId,

          externalEventId,

          contentHash:
            hash,
        }
      );
    }


    // =========================================================
    // DELETE STALE GOOGLE EVENTS
    // =========================================================

    for (
      const mapping of mappings
    ) {
      if (
        mapping.source_type !==
          "activity" &&
        mapping.source_type !==
          "calendar_event"
      ) {
        continue;
      }


      const key =
        mappingKey(
          mapping.source_type,
          mapping.source_id
        );


      if (
        liveSourceKeys.has(key)
      ) {
        continue;
      }


      await removeGoogleEvent(
        calendar,

        integration
          .external_calendar_id,

        mapping
          .external_event_id
      );


      await promisifyModel(
        deleteSyncMapping,

        integration.id,

        mapping.source_type,

        mapping.source_id
      );


      deleted++;
    }


    await promisifyModel(
      markIntegrationSynced,
      integration.id
    );


    return {
      created,
      updated,
      unchanged,
      deleted,
      total:
        sources.activities.length +
        sources.events.length,
    };

  } catch (error) {

    try {
      await promisifyModel(
        markIntegrationError,
        integration.id,
        error.message ??
          "Google Calendar sync failed."
      );
    } catch {
      // Do not hide the original sync failure.
    }

    throw error;
  }
}