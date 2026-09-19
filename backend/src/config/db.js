import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

// The one connection pool for the whole app. Reads DATABASE_URL from .env.
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Run one parameterized query. Returns the full pg result, so callers can read
 * result.rows (the data) and result.rowCount (rows affected).
 */
export const query = (text, params) => pgPool.query(text, params);

/**
 * Run several queries inside ONE transaction on a single connection.
 * If the callback throws, everything rolls back; the connection is always released.
 */
export const withTransaction = async (callback) => {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Boot check — verifies the database is reachable before the server starts.
export const initDB = async () => {
  try {
    await pgPool.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("Database connection failed:", err.message);
    return false;
  }
};