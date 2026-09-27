import { query } from "../config/db.js";

/**
 * Get all calendar-only events for a user.
 */
export const getCalendarEvents = async (
  userId,
  callback
) => {
  try {
    const { rows } = await query(
      `SELECT
         event_id AS id,
         title,
         TO_CHAR(event_date, 'YYYY-MM-DD') AS date,
         TO_CHAR(event_time, 'HH24:MI') AS time,
         created_at,
         updated_at
       FROM calendar_events
       WHERE user_id = $1
       ORDER BY event_date ASC, event_time ASC NULLS LAST`,
      [userId]
    );

    callback(null, rows);
  } catch (error) {
    callback(error);
  }
};


/**
 * Create a calendar-only event.
 */
export const createCalendarEvent = async (
  {
    userId,
    title,
    date,
    time,
  },
  callback
) => {
  try {
    const { rows } = await query(
      `INSERT INTO calendar_events (
         user_id,
         title,
         event_date,
         event_time
       )
       VALUES ($1, $2, $3, $4)
       RETURNING
         event_id AS id,
         title,
         TO_CHAR(event_date, 'YYYY-MM-DD') AS date,
         TO_CHAR(event_time, 'HH24:MI') AS time,
         created_at,
         updated_at`,
      [
        userId,
        title,
        date,
        time || null,
      ]
    );

    callback(null, rows[0]);
  } catch (error) {
    callback(error);
  }
};


/**
 * Delete one calendar event.
 *
 * user_id is included in the WHERE clause so users can
 * never delete another user's event.
 */
export const deleteCalendarEvent = async (
  userId,
  eventId,
  callback
) => {
  try {
    const { rows } = await query(
      `DELETE FROM calendar_events
       WHERE event_id = $1
         AND user_id = $2
       RETURNING event_id AS id`,
      [eventId, userId]
    );

    callback(null, rows[0] || null);
  } catch (error) {
    callback(error);
  }
};