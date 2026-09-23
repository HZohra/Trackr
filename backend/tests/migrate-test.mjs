// Applies backend/migrations to the TEST database. Run once with `npm run test:db`.
import "dotenv/config";

if (!process.env.TEST_DATABASE_URL) {
    console.error("TEST_DATABASE_URL is required (a throwaway Postgres DB).");
    process.exit(1);
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// migrate.js runs on import, against process.env.DATABASE_URL (now the test DB).
await import("../src/db/migrate.js");