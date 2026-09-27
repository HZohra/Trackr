import express from "express";

import {
  addCalendarEvent,
  getAllCalendarEvents,
  removeCalendarEvent,
} from "../controllers/calendarEventController.js";

import {
  verifyToken,
} from "../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get(
  "/",
  getAllCalendarEvents
);

router.post(
  "/",
  addCalendarEvent
);

router.delete(
  "/:eventId",
  removeCalendarEvent
);

export default router;