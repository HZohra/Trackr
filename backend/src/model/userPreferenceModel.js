import { query } from "../config/db.js";


/**
 * Return the user's saved timezone.
 *
 * If no preference row exists yet, return null.
 */
export const getUserTimezone = async (
  userId,
  callback
) => {
  try {
    const { rows } = await query(
      `SELECT timezone
       FROM user_preferences
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    callback(
      null,
      rows[0]?.timezone ?? null
    );
  } catch (error) {
    callback(error);
  }
};


/**
 * Create or update the user's timezone.
 */
export const upsertUserTimezone = async (
  userId,
  timezone,
  callback
) => {
  try {
    const { rows } = await query(
      `INSERT INTO user_preferences (
         user_id,
         timezone
       )
       VALUES ($1, $2)

       ON CONFLICT (user_id)
       DO UPDATE SET
         timezone = EXCLUDED.timezone

       RETURNING
         user_id,
         timezone,
         created_at,
         updated_at`,
      [
        userId,
        timezone,
      ]
    );

    callback(
      null,
      rows[0]
    );
  } catch (error) {
    callback(error);
  }
};