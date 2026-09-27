import { google } from "googleapis";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.app.created";

/**
 * Creates the OAuth client used for Google Calendar authorization.
 */
export function createGoogleOAuthClient() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  } = process.env;

  if (
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REDIRECT_URI
  ) {
    throw new Error(
      "Missing Google Calendar OAuth environment variables."
    );
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generates the Google authorization URL that the frontend
 * will redirect the user to when they click:
 *
 * Connect Google Calendar
 */
export function getGoogleAuthorizationUrl(state) {
  const oauth2Client = createGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",

    // During development this helps ensure Google gives us
    // a refresh token.
    prompt: "consent",

    scope: [GOOGLE_CALENDAR_SCOPE],

    state,
  });
}

/**
 * Exchanges Google's temporary authorization code
 * for access/refresh tokens.
 */
export async function exchangeGoogleCode(code) {
  if (!code) {
    throw new Error("Google authorization code is required.");
  }

  const oauth2Client = createGoogleOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  return {
    oauth2Client,
    tokens,
  };
}

/**
 * Creates the dedicated "Trackr" calendar inside the
 * user's Google Calendar account.
 */
export async function createTrackrGoogleCalendar(oauth2Client) {
  const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  const response = await calendar.calendars.insert({
    requestBody: {
      summary: "Trackr",
      description:
        "Assignments, exams, quizzes, deadlines and study events synced from Trackr.",
      timeZone: "America/Toronto",
    },
  });

  if (!response.data?.id) {
    throw new Error(
      "Google Calendar did not return a calendar ID."
    );
  }

  return response.data;
}

/**
 * Creates an authenticated Google Calendar API client
 * using a stored refresh token.
 *
 * We will use this later for automatic background syncing.
 */
export function createAuthorizedCalendarClient(refreshToken) {
  if (!refreshToken) {
    throw new Error("Google refresh token is required.");
  }

  const oauth2Client = createGoogleOAuthClient();

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.calendar({
    version: "v3",
    auth: oauth2Client,
  });
}