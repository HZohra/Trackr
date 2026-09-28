import crypto from "crypto";

import {
  createOAuthState,
  consumeOAuthState,
  getCalendarIntegrationsForUser,
  getCalendarIntegrationInternal,
  upsertGoogleIntegration,
  deleteCalendarIntegration,
} from "../model/calendarIntegrationModel.js";

import {
  getGoogleAuthorizationUrl,
  exchangeGoogleCode,
  createTrackrGoogleCalendar,
  deleteTrackrGoogleCalendar,
  revokeGoogleCalendarAccess,
} from "../services/calendar/googleCalendarService.js";

import {
  encryptCalendarToken,
  decryptCalendarToken,
} from "../services/calendar/calendarTokenCrypto.js";

import {
  syncGoogleCalendarForUser,
} from "../services/calendar/googleCalendarSyncService.js";

const OAUTH_STATE_LIFETIME_MINUTES = 10;


/**
 * Convert the existing callback-style model functions
 * into promises so the controller stays readable.
 */
function createOAuthStateAsync(
  userId,
  stateHash,
  expiresAt
) {
  return new Promise((resolve, reject) => {
    createOAuthState(
      userId,
      stateHash,
      expiresAt,
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


function consumeOAuthStateAsync(stateHash) {
  return new Promise((resolve, reject) => {
    consumeOAuthState(
      stateHash,
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


function getIntegrationsAsync(userId) {
  return new Promise((resolve, reject) => {
    getCalendarIntegrationsForUser(
      userId,
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


function getInternalIntegrationAsync(
  userId,
  provider
) {
  return new Promise((resolve, reject) => {
    getCalendarIntegrationInternal(
      userId,
      provider,
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


function upsertGoogleIntegrationAsync(data) {
  return new Promise((resolve, reject) => {
    upsertGoogleIntegration(
      data,
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


/**
 * Hashes the OAuth state before storing/looking it up.
 */
function hashOAuthState(state) {
  return crypto
    .createHash("sha256")
    .update(state)
    .digest("hex");
}

function deleteIntegrationAsync(
  userId,
  provider
) {
  return new Promise(
    (resolve, reject) => {
      deleteCalendarIntegration(
        userId,
        provider,
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );
    }
  );
}


/**
 * GET /api/calendar-integrations
 *
 * Returns connection status to Angular.
 *
 * Never exposes refresh tokens.
 */
export async function getCalendarIntegrations(
  req,
  res
) {
  try {
    const userId = req.user.user_id;

    const integrations =
      await getIntegrationsAsync(userId);

    const google =
      integrations.find(
        (item) => item.provider === "google"
      ) || null;

    const apple =
      integrations.find(
        (item) => item.provider === "apple"
      ) || null;

    return res.json({
      google: {
        connected:
          google?.status === "connected",

        syncEnabled:
          google?.sync_enabled ?? false,

        accountEmail:
          google?.provider_account_email ?? null,

        lastSyncedAt:
          google?.last_synced_at ?? null,

        status:
          google?.status ?? "disconnected",
      },

      apple: {
        connected:
          apple?.status === "connected",

        syncEnabled:
          apple?.sync_enabled ?? false,

        lastSyncedAt:
          apple?.last_synced_at ?? null,

        status:
          apple?.status ?? "disconnected",
      },
    });
  } catch (error) {
    console.error(
      "Failed to load calendar integrations:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load calendar integrations.",
    });
  }
}


/**
 * GET /api/calendar-integrations/google/connect
 *
 * Protected by Trackr JWT authentication.
 *
 * Generates a one-time OAuth state and gives Angular
 * the Google authorization URL.
 */
export async function connectGoogleCalendar(
  req,
  res
) {
  try {
    const userId = req.user.user_id;

    const rawState =
      crypto.randomBytes(32).toString("hex");

    const stateHash =
      hashOAuthState(rawState);

    const expiresAt = new Date(
      Date.now() +
        OAUTH_STATE_LIFETIME_MINUTES *
          60 *
          1000
    );

    await createOAuthStateAsync(
      userId,
      stateHash,
      expiresAt
    );

    const authorizationUrl =
      getGoogleAuthorizationUrl(rawState);

    return res.json({
      authorizationUrl,
    });
  } catch (error) {
    console.error(
      "Failed to begin Google Calendar OAuth:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to connect Google Calendar.",
    });
  }
}


/**
 * GET /api/calendar-integrations/google/callback
 *
 * Google redirects here after the user approves or
 * denies Trackr access.
 *
 * IMPORTANT:
 * This endpoint does NOT use verifyToken because
 * Google's redirect does not include the Angular JWT.
 *
 * Instead, we securely identify the Trackr user using
 * the one-time OAuth state stored earlier.
 */
export async function googleCalendarCallback(
  req,
  res
) {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    "http://localhost:4200";

  try {
    const {
      code,
      state,
      error: googleError,
    } = req.query;

    if (googleError) {
      console.warn(
        "Google Calendar authorization denied:",
        googleError
      );

      return res.redirect(
        `${frontendUrl}/calendar?google=denied`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/calendar?google=invalid_callback`
      );
    }

    /*
     * Validate + consume state.
     *
     * Because the database DELETEs the state when it is
     * successfully found, the same callback cannot be
     * replayed later.
     */
    const stateHash =
      hashOAuthState(String(state));

    const oauthState =
      await consumeOAuthStateAsync(stateHash);

    if (!oauthState) {
      return res.redirect(
        `${frontendUrl}/calendar?google=invalid_state`
      );
    }

    const userId =
      oauthState.user_id;

    /*
     * Exchange Google's short-lived authorization code
     * for OAuth credentials.
     */
    const {
      oauth2Client,
      tokens,
    } = await exchangeGoogleCode(
      String(code)
    );

    /*
     * Check whether this Trackr user already connected
     * Google Calendar before.
     *
     * This prevents creating a second "Trackr" calendar
     * every time the user reconnects.
     */
    const existingIntegration =
      await getInternalIntegrationAsync(
        userId,
        "google"
      );

    let externalCalendarId =
      existingIntegration
        ?.external_calendar_id ??
      null;

    /*
     * First connection:
     * create the dedicated Trackr Google calendar.
     */
    if (!externalCalendarId) {
      const googleCalendar =
        await createTrackrGoogleCalendar(
          oauth2Client
        );

      externalCalendarId =
        googleCalendar.id;
    }

    /*
     * Google may omit refresh_token during some
     * reconnection flows.
     *
     * Our model preserves the previous encrypted token
     * when encryptedRefreshToken is null.
     */
    const encryptedRefreshToken =
      tokens.refresh_token
        ? encryptCalendarToken(
            tokens.refresh_token
          )
        : null;

    /*
     * On the very first connection, we require a
     * refresh token because Trackr needs background
     * access after the browser closes.
     */
    if (
      !encryptedRefreshToken &&
      !existingIntegration
        ?.encrypted_refresh_token
    ) {
      throw new Error(
        "Google did not provide a refresh token."
      );
    }

    await upsertGoogleIntegrationAsync({
      userId,

      // We are not requesting broad Google profile/email
      // permissions, so this remains null for now.
      accountEmail: null,

      externalCalendarId,

      encryptedRefreshToken,
    });

    return res.redirect(
      `${frontendUrl}/calendar?google=connected`
    );
  } catch (error) {
    console.error(
      "Google Calendar callback failed:",
      error
    );

    return res.redirect(
      `${frontendUrl}/calendar?google=error`
    );
  }
}

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
/**
 * DELETE /api/calendar-integrations/google
 *
 * Disconnect Google Calendar from Trackr.
 *
 * Flow:
 * 1. Load the user's Google integration.
 * 2. Delete Trackr's dedicated Google calendar.
 * 3. Revoke Google's refresh token.
 * 4. Remove the local integration + mappings.
 */
export async function disconnectGoogleCalendar(
  req,
  res
) {
  const userId =
    req.user.user_id;

  try {
    const integration =
      await getInternalIntegrationAsync(
        userId,
        "google"
      );

    // Already disconnected.
    if (!integration) {
      return res.json({
        message:
          "Google Calendar is already disconnected.",
      });
    }


    let refreshToken = null;

    if (
      integration
        .encrypted_refresh_token
    ) {
      refreshToken =
        decryptCalendarToken(
          integration
            .encrypted_refresh_token
        );
    }


    // --------------------------------------------------
    // DELETE TRACKR GOOGLE CALENDAR
    // --------------------------------------------------

    if (
      refreshToken &&
      integration.external_calendar_id
    ) {
      try {
        await deleteTrackrGoogleCalendar(
          refreshToken,
          integration.external_calendar_id
        );
      } catch (error) {
        const status =
          error?.response?.status ??
          error?.code ??
          null;

        /*
         * 401 / 403 usually means Google access was
         * already revoked or is no longer usable.
         *
         * In that case we can still safely remove
         * Trackr's local integration.
         */
        if (
          status !== 401 &&
          status !== 403
        ) {
          console.error(
            "Failed to delete Trackr Google calendar:",
            error
          );

          return res
            .status(502)
            .json({
              message:
                "Could not remove the Trackr calendar from Google. Please try again.",
            });
        }
      }
    }


    // --------------------------------------------------
    // REVOKE GOOGLE ACCESS
    // --------------------------------------------------

    if (refreshToken) {
      try {
        await revokeGoogleCalendarAccess(
          refreshToken
        );
      } catch (error) {
        /*
         * We still remove the local encrypted token.
         *
         * This prevents Trackr from retaining Google
         * credentials even if Google's revoke endpoint
         * says the token is already invalid.
         */
        console.warn(
          "Google token revoke did not complete:",
          error?.message ?? error
        );
      }
    }


    // --------------------------------------------------
    // DELETE LOCAL INTEGRATION
    // --------------------------------------------------

    await deleteIntegrationAsync(
      userId,
      "google"
    );


    return res.json({
      message:
        "Google Calendar disconnected successfully.",
    });

  } catch (error) {
    console.error(
      "Failed to disconnect Google Calendar:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Unable to disconnect Google Calendar.",
      });
  }
}