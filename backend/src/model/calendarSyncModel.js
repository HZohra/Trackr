import { query } from "../config/db.js";


export const getTrackrCalendarSources = async (
  userId,
  callback
) => {
  try {
    const [activitiesResult, eventsResult] =
      await Promise.all([
        query(
          `SELECT
             a.activity_id,
             a.activity_name,
             a.activity_category_id,
             a.grading_weight,
             a.grade,
             a.status,
             c.course_code,

             TO_CHAR(
               a.due_date,
               'YYYY-MM-DD"T"HH24:MI:SS'
             ) AS start_datetime,

             TO_CHAR(
               a.due_date + INTERVAL '30 minutes',
               'YYYY-MM-DD"T"HH24:MI:SS'
             ) AS end_datetime

           FROM activities a
           JOIN courses c
             ON c.course_id = a.course_id

           WHERE c.user_id = $1
             AND a.due_date IS NOT NULL

           ORDER BY a.due_date ASC`,
          [userId]
        ),

        query(
          `SELECT
             event_id,
             title,

             TO_CHAR(
               event_date,
               'YYYY-MM-DD'
             ) AS event_date,

             CASE
               WHEN event_time IS NULL
               THEN NULL
               ELSE TO_CHAR(
                 event_date + event_time,
                 'YYYY-MM-DD"T"HH24:MI:SS'
               )
             END AS start_datetime,

             CASE
               WHEN event_time IS NULL
               THEN NULL
               ELSE TO_CHAR(
                 event_date + event_time + INTERVAL '1 hour',
                 'YYYY-MM-DD"T"HH24:MI:SS'
               )
             END AS end_datetime,

             TO_CHAR(
               event_date + 1,
               'YYYY-MM-DD'
             ) AS next_date,

             event_time

           FROM calendar_events

           WHERE user_id = $1

           ORDER BY event_date ASC,
                    event_time ASC NULLS LAST`,
          [userId]
        ),
      ]);

    callback(null, {
      activities: activitiesResult.rows,
      events: eventsResult.rows,
    });
  } catch (error) {
    callback(error);
  }
};


export const getSyncMappings = async (
  integrationId,
  callback
) => {
  try {
    const { rows } = await query(
      `SELECT
         id,
         user_id,
         integration_id,
         source_type,
         source_id,
         external_event_id,
         content_hash,
         sync_status,
         last_synced_at

       FROM calendar_event_syncs

       WHERE integration_id = $1`,
      [integrationId]
    );

    callback(null, rows);
  } catch (error) {
    callback(error);
  }
};


export const upsertSyncMapping = async (
  {
    userId,
    integrationId,
    sourceType,
    sourceId,
    externalEventId,
    contentHash,
  },
  callback
) => {
  try {
    const { rows } = await query(
      `INSERT INTO calendar_event_syncs (
         user_id,
         integration_id,
         source_type,
         source_id,
         external_event_id,
         content_hash,
         sync_status,
         last_error,
         last_synced_at
       )

       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         'synced',
         NULL,
         NOW()
       )

       ON CONFLICT (
         integration_id,
         source_type,
         source_id
       )

       DO UPDATE SET
         external_event_id =
           EXCLUDED.external_event_id,

         content_hash =
           EXCLUDED.content_hash,

         sync_status =
           'synced',

         last_error =
           NULL,

         last_synced_at =
           NOW()

       RETURNING *`,
      [
        userId,
        integrationId,
        sourceType,
        String(sourceId),
        externalEventId,
        contentHash,
      ]
    );

    callback(null, rows[0]);
  } catch (error) {
    callback(error);
  }
};


export const deleteSyncMapping = async (
  integrationId,
  sourceType,
  sourceId,
  callback
) => {
  try {
    await query(
      `DELETE FROM calendar_event_syncs

       WHERE integration_id = $1
         AND source_type = $2
         AND source_id = $3`,
      [
        integrationId,
        sourceType,
        String(sourceId),
      ]
    );

    callback(null);
  } catch (error) {
    callback(error);
  }
};