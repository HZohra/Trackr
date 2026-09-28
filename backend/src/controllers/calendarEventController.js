import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
} from "../model/calendarEventModel.js";

import {
  queueGoogleCalendarSync,
} from "../services/calendar/calendarAutoSyncService.js";


/**
 * GET /api/calendar-events
 *
 * Return all calendar-only events belonging
 * to the currently logged-in user.
 */
export const getAllCalendarEvents = (
  req,
  res
) => {
  getCalendarEvents(
    req.user.user_id,

    (error, events) => {
      if (error) {
        console.error(
          "Failed to load calendar events:",
          error
        );

        return res
          .status(500)
          .json({
            message:
              "Unable to load calendar events.",
          });
      }

      return res.json(
        events
      );
    }
  );
};


/**
 * POST /api/calendar-events
 *
 * Create a calendar-only event.
 */
export const addCalendarEvent = (
  req,
  res
) => {
  const {
    title,
    date,
    time = null,
  } = req.body ?? {};


  // ----------------------------------------------------------
  // TITLE
  // ----------------------------------------------------------

  const cleanTitle =
    typeof title === "string"
      ? title.trim()
      : "";

  if (!cleanTitle) {
    return res
      .status(400)
      .json({
        message:
          "Event title is required.",
      });
  }


  // ----------------------------------------------------------
  // DATE
  // ----------------------------------------------------------

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return res
      .status(400)
      .json({
        message:
          "Event date must use YYYY-MM-DD format.",
      });
  }


  // ----------------------------------------------------------
  // TIME
  // ----------------------------------------------------------

  if (
    time !== null &&
    time !== "" &&
    (
      typeof time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    )
  ) {
    return res
      .status(400)
      .json({
        message:
          "Event time must use HH:MM format.",
      });
  }


  // ----------------------------------------------------------
  // CREATE
  // ----------------------------------------------------------

  createCalendarEvent(
    {
      userId:
        req.user.user_id,

      title:
        cleanTitle,

      date,

      time:
        time === ""
          ? null
          : time,
    },

    (error, event) => {
      if (error) {
        console.error(
          "Failed to create calendar event:",
          error
        );

        return res
          .status(500)
          .json({
            message:
              "Unable to create calendar event.",
          });
      }


      // ------------------------------------------------------
      // AUTOMATIC GOOGLE SYNC
      // ------------------------------------------------------
      //
      // We queue the Google sync only after the Trackr event
      // has successfully been stored.
      //
      // The user does not have to wait for Google before
      // receiving the successful Trackr response.

      queueGoogleCalendarSync(
        req.user.user_id
      );


      return res
        .status(201)
        .json(event);
    }
  );
};


/**
 * DELETE /api/calendar-events/:eventId
 *
 * Delete one calendar-only event belonging
 * to the currently logged-in user.
 */
export const removeCalendarEvent = (
  req,
  res
) => {
  const eventId =
    Number(
      req.params.eventId
    );


  // ----------------------------------------------------------
  // VALIDATE EVENT ID
  // ----------------------------------------------------------

  if (
    !Number.isInteger(eventId) ||
    eventId < 1
  ) {
    return res
      .status(400)
      .json({
        message:
          "Invalid event ID.",
      });
  }


  // ----------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------

  deleteCalendarEvent(
    req.user.user_id,
    eventId,

    (error, deleted) => {
      if (error) {
        console.error(
          "Failed to delete calendar event:",
          error
        );

        return res
          .status(500)
          .json({
            message:
              "Unable to delete calendar event.",
          });
      }


      if (!deleted) {
        return res
          .status(404)
          .json({
            message:
              "Calendar event not found.",
          });
      }


      // ------------------------------------------------------
      // AUTOMATIC GOOGLE SYNC
      // ------------------------------------------------------
      //
      // The Trackr event no longer exists.
      // The sync engine will detect the stale Google mapping,
      // remove the Google event, and delete its mapping.

      queueGoogleCalendarSync(
        req.user.user_id
      );


      return res
        .status(204)
        .send();
    }
  );
};