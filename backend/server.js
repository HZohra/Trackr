import dotenv from "dotenv";
import cron from "node-cron";
import app from "./app.js";
import { initDB } from "./src/config/db.js";
import { getJWTSecret, initJWTSecret } from "./src/middleware/auth.js";
import { runReminders } from "./src/services/reminderService.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Verify the database is reachable before accepting traffic.
const dbConnected = await initDB();
if (!dbConnected) {
    process.exit(1);
}
console.log("Database connection successful.");

// Load and validate the JWT secret; refuse to start without one.
initJWTSecret();
if (!getJWTSecret()) {
    console.error("JWT secret is not set.");
    process.exit(1);
}
console.log("JWT secret is set.");

// Reminder sweep every 15 minutes.
cron.schedule("*/15 * * * *", () => runReminders().catch(console.error));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});