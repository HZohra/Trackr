import dotenv from "dotenv";
import mysql from "mysql2";

dotenv.config();

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

let dbConnected = false;

// Checks if the database is reachable; other modules can call isDBExists()
// to see whether the connection succeeded before running queries.
export const initDB = async () => {
    return new Promise((resolve) => {
        pool.getConnection((err, conn) => {
            if (err) {
                console.error("Database connection failed:", err.message);
                dbConnected = false;
                return resolve(false);
            }
            conn.query("SELECT 1", (err) => {
                conn.release();
                dbConnected = !err;
                if (err) {
                    console.error("Database ping failed:", err.message);
                }
                resolve(dbConnected);
            });
        });
    });
};

export default pool;