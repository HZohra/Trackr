import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
} from "../model/calendarEventModel.js";

import {
  syncGoogleCalendarForUser,
} from "../services/calendar/googleCalendarSyncService.js";



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

        return res.status(500).json({
          message:
            "Unable to load calendar events.",
        });
      }

      return res.json(events);
    }
  );
};


export const addCalendarEvent = (
  req,
  res
) => {
  const {
    title,
    date,
    time = null,
  } = req.body ?? {};

  const cleanTitle =
    typeof title === "string"
      ? title.trim()
      : "";

  if (!cleanTitle) {
    return res.status(400).json({
      message: "Event title is required.",
    });
  }

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return res.status(400).json({
      message:
        "Event date must use YYYY-MM-DD format.",
    });
  }

  if (
    time !== null &&
    time !== "" &&
    (
      typeof time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    )
  ) {
    return res.status(400).json({
      message:
        "Event time must use HH:MM format.",
    });
  }

  createCalendarEvent(
    {
      userId: req.user.user_id,
      title: cleanTitle,
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

        return res.status(500).json({
          message:
            "Unable to create calendar event.",
        });
      }

      return res.status(201).json(event);
    }
  );
};


export const removeCalendarEvent = (
  req,
  res
) => {
  const eventId = Number(
    req.params.eventId
  );

  if (
    !Number.isInteger(eventId) ||
    eventId < 1
  ) {
    return res.status(400).json({
      message: "Invalid event ID.",
    });
  }

  deleteCalendarEvent(
    req.user.user_id,
    eventId,
    (error, deleted) => {
      if (error) {
        console.error(
          "Failed to delete calendar event:",
          error
        );

        return res.status(500).json({
          message:
            "Unable to delete calendar event.",
        });
      }

      if (!deleted) {
        return res.status(404).json({
          message:
            "Calendar event not found.",
        });
      }

      return res.status(204).send();
    }
  );
};

export async function syncGoogleCalendar(
  req,
  res
) {
  try {
    const result =
      await syncGoogleCalendarForUser(
        req.user.user_id
      );

    return res.json({
      message:
        "Google Calendar synchronized successfully.",

      ...result,
    });

  } catch (error) {
    console.error(
      "Google Calendar synchronization failed:",
      error
    );

    return res
      .status(
        error.statusCode ??
          500
      )
      .json({
        message:
          error.message ??
          "Unable to synchronize Google Calendar.",
      });
  }
}