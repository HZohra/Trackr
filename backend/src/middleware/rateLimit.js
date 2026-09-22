import rateLimit from "express-rate-limit";

// Rate limiting is ON in production automatically. In development it's OFF, so
// local testing — registering/logging in repeatedly, running the auth scripts —
// isn't throttled. To exercise the limits locally, start the server with
// RATE_LIMIT=on.
const enabled =
    process.env.NODE_ENV === "production" || process.env.RATE_LIMIT === "on";

const base = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    standardHeaders: "draft-7", // send RateLimit-* headers
    legacyHeaders: false, // drop the old X-RateLimit-* headers
    skip: () => !enabled,
};

// Strict: sensitive auth actions (login, register, forgot/reset password).
// ~5 attempts per IP per 15 min — room for honest mistakes, hostile to brute
// force and account-enumeration probing.
export const authLimiter = rateLimit({
    ...base,
    limit: 5,
    message: {
        message: "Too many attempts. Please wait 15 minutes and try again.",
    },
});

// Syllabus upload triggers paid Claude calls, so bound it separately — looser
// than auth, but still capped.
export const uploadLimiter = rateLimit({
    ...base,
    limit: 20,
    message: {
        message: "Too many uploads. Please wait a while and try again.",
    },
});