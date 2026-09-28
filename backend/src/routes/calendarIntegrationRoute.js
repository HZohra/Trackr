import express from "express";

import {
  getCalendarIntegrations,
  connectGoogleCalendar,
  googleCalendarCallback,
  syncGoogleCalendar,
  disconnectGoogleCalendar,
  updateCalendarTimezone,
} from "../controllers/calendarIntegrationController.js";

import {
  verifyToken,
} from "../middleware/auth.js";


const router =
  express.Router();


/**
 * GET /api/calendar-integrations
 *
 * Returns the logged-in user's calendar integration status.
 */
router.get(
  "/",
  verifyToken,
  getCalendarIntegrations,
);


/**
 * PUT /api/calendar-integrations/timezone
 *
 * Saves the logged-in user's IANA timezone.
 */
router.put(
  "/timezone",
  verifyToken,
  updateCalendarTimezone,
);


/**
 * GET /api/calendar-integrations/google/connect
 *
 * Begins the Google OAuth flow.
 */
router.get(
  "/google/connect",
  verifyToken,
  connectGoogleCalendar,
);


/**
 * GET /api/calendar-integrations/google/callback
 *
 * Google redirects directly here.
 *
 * Do NOT add verifyToken because Google does not send
 * Trackr's JWT back with the redirect.
 */
router.get(
  "/google/callback",
  googleCalendarCallback,
);


/**
 * POST /api/calendar-integrations/google/sync
 *
 * Manually synchronizes Trackr calendar data with
 * the dedicated Google "Trackr" calendar.
 */
router.post(
  "/google/sync",
  verifyToken,
  syncGoogleCalendar,
);


/**
 * DELETE /api/calendar-integrations/google
 *
 * Disconnects Google Calendar.
 */
router.delete(
  "/google",
  verifyToken,
  disconnectGoogleCalendar,
);


export default router;