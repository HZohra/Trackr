import { query } from "../config/db.js";

/**
 * Store a temporary OAuth state.
 *
 * We store only the SHA-256 hash of the state.
 * The raw state is sent to Google and never stored in the database.
 */
export const createOAuthState = async (
  userId,
  stateHash,
  expiresAt,
  callback
) => {
  try {
    const { rows } = await query(
      `INSERT INTO calendar_oauth_states (
         state_hash,
         user_id,
         provider,
         expires_at
       )
       VALUES ($1, $2, 'google', $3)
       RETURNING
         state_hash,
         user_id,
         provider,
         expires_at,
         created_at`,
      [stateHash, userId, expiresAt]
    );

    callback(null, rows[0]);
  } catch (error) {
    callback(error);
  }
};


/**
 * Validate and consume an OAuth state.
 *
 * DELETE ... RETURNING makes this one-time-use:
 * once successfully consumed, the state cannot be reused.
 */
export const consumeOAuthState = async (
  stateHash,
  callback
) => {
  try {
    const { rows } = await query(
      `DELETE FROM calendar_oauth_states
       WHERE state_hash = $1
         AND provider = 'google'
         AND expires_at > NOW()
       RETURNING
         user_id,
         provider,
         expires_at`,
      [stateHash]
    );

    callback(null, rows[0] || null);
  } catch (error) {
    callback(error);
  }
};


/**
 * Remove expired OAuth states.
 *
 * This is cleanup only. OAuth validation does not depend on it.
 */
export const deleteExpiredOAuthStates = async (
  callback
) => {
  try {
    const result = await query(
      `DELETE FROM calendar_oauth_states
       WHERE expires_at <= NOW()`
    );

    callback(null, {
      deleted: result.rowCount,
    });
  } catch (error) {
    callback(error);
  }
};


/**
 * Return Calendar connection information that is safe
 * to send to the frontend.
 *
 * IMPORTANT:
 * encrypted_refresh_token is intentionally NOT selected.
 */
export const getCalendarIntegrationsForUser = async (
  userId,
  callback
) => {
  try {
    const { rows } = await query(
      `SELECT
         id,
         provider,
         provider_account_email,
         external_calendar_id,
         sync_enabled,
         status,
         last_synced_at,
         last_error,
         created_at,
         updated_at
       FROM calendar_integrations
       WHERE user_id = $1
       ORDER BY provider ASC`,
      [userId]
    );

    callback(null, rows);
  } catch (error) {
    callback(error);
  }
};


/**
 * Internal backend lookup.
 *
 * This DOES return the encrypted token because later the
 * backend needs it to synchronize events with Google.
 *
 * Never return this object directly to Angular.
 */
export const getCalendarIntegrationInternal = async (
  userId,
  provider,
  callback
) => {
  try {
    const { rows } = await query(
      `SELECT
         id,
         user_id,
         provider,
         provider_account_email,
         external_calendar_id,
         encrypted_refresh_token,
         sync_enabled,
         status,
         last_synced_at,
         last_error,
         created_at,
         updated_at
       FROM calendar_integrations
       WHERE user_id = $1
         AND provider = $2
       LIMIT 1`,
      [userId, provider]
    );

    callback(null, rows[0] || null);
  } catch (error) {
    callback(error);
  }
};


/**
 * Store or update the user's Google Calendar connection.
 *
 * If the user reconnects and Google does not provide a new
 * refresh token, COALESCE preserves the previously stored one.
 */
export const upsertGoogleIntegration = async (
  {
    userId,
    accountEmail = null,
    externalCalendarId,
    encryptedRefreshToken = null,
  },
  callback
) => {
  try {
    const { rows } = await query(
      `INSERT INTO calendar_integrations (
         user_id,
         provider,
         provider_account_email,
         external_calendar_id,
         encrypted_refresh_token,
         sync_enabled,
         status,
         last_error
       )
       VALUES (
         $1,
         'google',
         $2,
         $3,
         $4,
         TRUE,
         'connected',
         NULL
       )

       ON CONFLICT (user_id, provider)

       DO UPDATE SET
         provider_account_email =
           COALESCE(
             EXCLUDED.provider_account_email,
             calendar_integrations.provider_account_email
           ),

         external_calendar_id =
           EXCLUDED.external_calendar_id,

         encrypted_refresh_token =
           COALESCE(
             EXCLUDED.encrypted_refresh_token,
             calendar_integrations.encrypted_refresh_token
           ),

         sync_enabled = TRUE,
         status = 'connected',
         last_error = NULL

       RETURNING
         id,
         user_id,
         provider,
         provider_account_email,
         external_calendar_id,
         sync_enabled,
         status,
         last_synced_at,
         created_at,
         updated_at`,
      [
        userId,
        accountEmail,
        externalCalendarId,
        encryptedRefreshToken,
      ]
    );

    callback(null, rows[0]);
  } catch (error) {
    callback(error);
  }
};


/**
 * Update the most recent successful synchronization time.
 */
export const markIntegrationSynced = async (
  integrationId,
  callback
) => {
  try {
    const { rows } = await query(
      `UPDATE calendar_integrations
       SET
         last_synced_at = NOW(),
         status = 'connected',
         last_error = NULL
       WHERE id = $1
       RETURNING
         id,
         last_synced_at,
         status`,
      [integrationId]
    );

    callback(null, rows[0] || null);
  } catch (error) {
    callback(error);
  }
};


/**
 * Record a provider synchronization error.
 */
export const markIntegrationError = async (
  integrationId,
  message,
  callback
) => {
  try {
    const { rows } = await query(
      `UPDATE calendar_integrations
       SET
         status = 'error',
         last_error = $2
       WHERE id = $1
       RETURNING
         id,
         status,
         last_error`,
      [integrationId, message]
    );

    callback(null, rows[0] || null);
  } catch (error) {
    callback(error);
  }
};


/**
 * Completely remove a Calendar integration.
 *
 * calendar_event_syncs rows are automatically removed because
 * the migration uses ON DELETE CASCADE.
 */
export const deleteCalendarIntegration = async (
  userId,
  provider,
  callback
) => {
  try {
    const { rows } = await query(
      `DELETE FROM calendar_integrations
       WHERE user_id = $1
         AND provider = $2
       RETURNING id, provider`,
      [userId, provider]
    );

    callback(null, rows[0] || null);
  } catch (error) {
    callback(error);
  }
};