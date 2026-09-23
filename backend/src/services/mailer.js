// src/services/mailer.js
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.APP_EMAIL,
        pass: process.env.APP_EMAIL_PASSWORD,
    },
});

// In tests we never touch the network. Sent messages are captured here so the
// suite can read the reset token out of the message body instead of a real inbox.
export const testOutbox = [];

export const sendMail = (to, subject, text) => {
    if (process.env.NODE_ENV === "test") {
        testOutbox.push({ to, subject, text });
        return Promise.resolve({ queued: true });
    }
    return transporter.sendMail({ from: process.env.APP_EMAIL, to, subject, text });
};