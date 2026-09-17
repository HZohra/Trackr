// src/services/reminderService.js
// Fetches activities whose reminder is due, sends each one, and marks the
// successful ones so they aren't sent again. Called by the scheduler (Step 6)
// and the manual admin trigger (Step 7).
import { getDueReminders, markReminderSent } from "../model/activityModel.js";
import { sendMail } from "./mailer.js";

// The model functions are callback-style; wrap them so we can await them.
const fetchDue = () =>
  new Promise((resolve, reject) =>
    getDueReminders((err, rows) => (err ? reject(err) : resolve(rows))),
  );

const markSent = (ids) =>
  new Promise((resolve, reject) =>
    markReminderSent(ids, (err, n) => (err ? reject(err) : resolve(n))),
  );

export async function runReminders() {
  const due = await fetchDue();
  const sentIds = [];

  for (const a of due) {
    // Format the due date nicely for the message body.
    const when = new Date(String(a.due_date).replace(" ", "T") + "Z")
      .toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

    const subject = `Reminder: ${a.activity_name} (${a.course_code}) due ${when}`;
    const body =
      `Hi ${a.first_name},\n\n` +
      `"${a.activity_name}" for ${a.course_code} — ${a.course_name} ` +
      `is due ${when}.\n\n— Trackr`;

    try {
      if (a.reminder_method === "email") {
        await sendMail(a.email, subject, body);
        sentIds.push(a.activity_id);
      }
      // WhatsApp branch is added in Step 8.
    } catch (err) {
      // One bad send shouldn't stop the rest — log it and move on.
      console.error(`Reminder failed for activity ${a.activity_id}:`, err.message);
    }
  }

  await markSent(sentIds);
  console.log(`Reminders: ${sentIds.length}/${due.length} sent.`);
  return { attempted: due.length, sent: sentIds.length };
}