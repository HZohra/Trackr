// tests/run-tests.js
// One-command harness: reset the test database, boot the server against it,
// run the node:test suite, then shut everything down. No external test
// framework — just Node's built-in test runner.
//
//   npm test
//
// Requires a .env.test file in backend/ (see .env.test.example).
//
// Two outputs are produced:
//   - human-readable spec output on stdout
//   - backend/test-results.tap  (machine-readable evidence for the report)

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");

// 1. Load test environment ------------------------------------------------- //
const envPath = path.join(BACKEND_ROOT, ".env.test");
if (!fs.existsSync(envPath)) {
    console.error("Missing backend/.env.test — copy .env.test.example and fill it in.");
    process.exit(1);
}
dotenv.config({ path: envPath });

const {
    DB_HOST = "127.0.0.1",
    DB_USER,
    DB_PASSWORD,
    DB_NAME = "trackr_test",
    DB_PORT = "3306",
    PORT = "5050",
    JWT_SECRET,
} = process.env;

// SAFETY GUARD: this script runs DROP DATABASE. Never let it point anywhere
// except a database whose name ends in "_test".
if (!/_test$/.test(DB_NAME)) {
    console.error(
        `Refusing to run: DB_NAME="${DB_NAME}" must end in "_test". ` +
            `This script drops the database it is pointed at.`,
    );
    process.exit(1);
}
if (!JWT_SECRET) {
    console.error("Missing JWT_SECRET in backend/.env.test — SEC-03 cannot mint a valid token.");
    process.exit(1);
}

const SCHEMA_FILE = path.join(REPO_ROOT, "db", "db_init.sql");
const TAP_FILE = path.join(BACKEND_ROOT, "test-results.tap");

// The child processes inherit these. Note that server.js calls dotenv.config()
// itself, which loads backend/.env — but dotenv does NOT overwrite variables
// that already exist in process.env, so these test values win.
const childEnv = {
    ...process.env,
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_PORT,
    PORT,
    JWT_SECRET,
    NODE_ENV: "test",
};

// 2. Reset the test schema ------------------------------------------------- //
async function resetDatabase() {
    console.log(`\n[setup] resetting database '${DB_NAME}' ...`);

    if (!fs.existsSync(SCHEMA_FILE)) {
        throw new Error(`schema file not found: ${SCHEMA_FILE}`);
    }

    const admin = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        port: Number(DB_PORT),
        multipleStatements: true,
    });

    try {
        await admin.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\`;`);
        await admin.query(`CREATE DATABASE \`${DB_NAME}\`;`);
        await admin.changeUser({ database: DB_NAME });

        const schema = fs.readFileSync(SCHEMA_FILE, "utf8");
        await admin.query(schema);
        console.log("[setup] schema loaded.");
    } finally {
        await admin.end();
    }
}

// 3. Start the server against the test DB ---------------------------------- //
function startServer() {
    console.log(`[setup] starting server on port ${PORT} against '${DB_NAME}' ...`);
    const server = spawn("node", ["server.js"], {
        cwd: BACKEND_ROOT,
        env: childEnv,
        stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
    server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));
    server.on("error", (err) => console.error("[server] failed to spawn:", err.message));
    return server;
}

async function waitForServer(retries = 40) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(`http://localhost:${PORT}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
            });
            if (res.status) return true; // any HTTP response means it's up
        } catch {
            /* not ready yet */
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error("server did not become ready in time");
}

// 4. Run the test files ---------------------------------------------------- //
// Pass explicit file paths rather than a directory: spawn() without a shell
// does not expand globs, and directory-scanning behaviour has changed between
// Node versions. Sorting keeps the run order deterministic (auth runs first,
// which is what the test plan's suggested order calls for).
function collectTestFiles() {
    const dir = path.join(BACKEND_ROOT, "tests");
    const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".test.js"))
        .sort()
        .map((f) => path.join("tests", f));

    if (files.length === 0) throw new Error("no *.test.js files found in tests/");
    console.log(`[setup] running ${files.length} test files: ${files.join(", ")}\n`);
    return files;
}

function runTests(testFiles) {
    return new Promise((resolve) => {
        const runner = spawn(
            "node",
            [
                "--test",
                "--test-concurrency=1", // tests share one database — no parallelism
                "--test-reporter=spec",
                "--test-reporter-destination=stdout",
                "--test-reporter=tap",
                `--test-reporter-destination=${TAP_FILE}`,
                ...testFiles,
            ],
            { cwd: BACKEND_ROOT, env: childEnv, stdio: "inherit" },
        );
        runner.on("exit", (code) => resolve(code ?? 1));
    });
}

// 5. Orchestrate ----------------------------------------------------------- //
let server;
try {
    await resetDatabase();
    server = startServer();
    await waitForServer();

    const code = await runTests(collectTestFiles());
    process.exitCode = code;

    if (fs.existsSync(TAP_FILE)) {
        console.log(`\n[run-tests] results written to ${path.relative(REPO_ROOT, TAP_FILE)}`);
    }
} catch (err) {
    console.error("\n[run-tests] fatal:", err.message);
    process.exitCode = 1;
} finally {
    if (server) server.kill("SIGTERM");
}