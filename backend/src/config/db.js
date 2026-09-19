import dotenv from "dotenv";
import mysql from "mysql2";
import pg from "pg";

dotenv.config();

/*
 * TEMPORARY MIGRATION BRIDGE
 * - `pool` (mysql2, default export) still powers the models not yet
 *   converted to Postgres, so the API keeps working during the swap.
 * - `query` / `withTransaction` (pg) power the models already migrated.
 * Once every model is on Postgres, the mysql2 half below is deleted.
 */

// ---- MySQL (legacy, being phased out) ----
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectionLimit: 100,
  waitForConnections: true,
  idleTimeout: 30000,
  connectTimeout: 2000,
});

// ---- PostgreSQL (the new home) ----
const { Pool } = pg;
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Run one parameterized query. Returns the full pg result, so callers can
 * read result.rows (the data) and result.rowCount (rows affected).
 * Example: const { rows } = await query("SELECT * FROM users WHERE user_id = $1", [id]);
 */
export const query = (text, params) => pgPool.query(text, params);

/**
 * Run several queries inside ONE transaction on a single connection.
 * The callback gets a client; if anything throws, the whole thing rolls back.
 * The connection is always released — no leaks.
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

// Boot check — now verifies the PostgreSQL connection instead of MySQL.
export const initDB = async () => {
  try {
    await pgPool.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("Database connection failed:", err.message);
    return false;
  }
};

export default pool;