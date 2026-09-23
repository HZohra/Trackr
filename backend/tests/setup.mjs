// Preloaded via `node --import ./tests/setup.mjs` BEFORE any test module loads,
// so db.js reads the TEST database, not your real one.
import "dotenv/config";

if (!process.env.TEST_DATABASE_URL) {
    console.error(
        "\nTEST_DATABASE_URL is not set. Tests create and delete users, so they need a\n" +
            "THROWAWAY Postgres database. Add TEST_DATABASE_URL=postgres://... to backend/.env\n" +
            "(or your shell) and run `npm run test:db` once to apply the schema.\n" +
            "Refusing to run against your real DATABASE_URL.\n",
    );
    process.exit(1);
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET =
        "test_jwt_secret_that_is_more_than_thirty_two_chars_0000";
}