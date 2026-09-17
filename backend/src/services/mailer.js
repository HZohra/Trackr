// src/services/mailer.js
// Single shared email transporter. Used by password reset and (soon) reminders.
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config(); // must run before the transporter reads APP_EMAIL at load time

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.APP_EMAIL,
    pass: process.env.APP_EMAIL_PASSWORD,
  },
});

// Sends a plain-text email. Returns the sendMail promise so callers can await
// it and catch failures — the reminder service relies on that.
export const sendMail = (to, subject, text) =>
  transporter.sendMail({ from: process.env.APP_EMAIL, to, subject, text });