// tests/helpers/harness.js
// Shared utilities for the Trackr automated test suite.
// Uses only Node built-ins (node:test runner, global fetch, FormData, node:fs)
// plus mysql2 and jsonwebtoken, both already project dependencies — no external
// test framework is introduced.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "..", "..");

// --------------------------------------------------------------------------- //
// SAFETY GUARD                                                                //
// --------------------------------------------------------------------------- //
// run-tests.js drops and recreates the database. If DB_NAME ever points at the
// real dev database, that destroys the team's data. Refuse to load at all
// unless the target database name ends in "_test".
if (!/_test$/.test(process.env.DB_NAME || "")) {
    throw new Error(
        `[harness] Refusing to run: DB_NAME="${process.env.DB_NAME}" must end in "_test". ` +
            `Check backend/.env.test.`,
    );
}

// Base URL of the server under test. run-tests.js starts the server on this
// port against the test database before any test file runs.
export const BASE_URL = `http://localhost:${process.env.PORT || 5050}`;

export const DEFAULT_PASSWORD = "Trackr2026!";

// --------------------------------------------------------------------------- //
// HTTP client                                                                 //
// --------------------------------------------------------------------------- //
// Thin wrapper over fetch. Returns { status, headers, body } so tests can
// assert on all three (headers are needed for the CORS case, SEC-07).
export async function api(
    method,
    endpoint,
    { token, body, headers = {}, timeoutMs = 4000 } = {},
) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const opts = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        signal: controller.signal,
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, opts);
        let parsed = null;
        const text = await res.text();
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            parsed = text;
        }
        return { status: res.status, headers: res.headers, body: parsed };
    } finally {
        clearTimeout(timer);
    }
}

// Multipart upload helper for the syllabus endpoint (USER-09 / USER-10).
// Node 18+ ships FormData and Blob globally. Do NOT set Content-Type by hand —
// fetch must generate the multipart boundary itself.
//
// `field` must match the field name the controller passes to multer's
// .single(...) call, otherwise multer sees no file and you get a false 400.
export async function uploadFile(
    endpoint,
    { token, field = "file", filename = "test.pdf", content = "", type = "application/pdf" } = {},
) {
    const form = new FormData();
    form.append(field, new Blob([content], { type }), filename);

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    });

    const text = await res.text();
    let parsed = null;
    try {
        parsed = text ? JSON.parse(text) : null;
    } catch {
        parsed = text;
    }
    return { status: res.status, headers: res.headers, body: parsed };
}

// A byte-accurate minimal PDF, so the upload test exercises a real PDF header
// rather than a text file with a .pdf extension.
export const MINIMAL_PDF =
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n" +
    "trailer<</Root 1 0 R>>\n%%EOF\n";

// --------------------------------------------------------------------------- //
// Database access (test DB only)                                              //
// --------------------------------------------------------------------------- //
export async function getDbConnection() {
    return mysql.createConnection({
        host: process.env.DB_HOST || "127.0.0.1",
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME, // trackr_test — enforced by the guard above
        port: Number(process.env.DB_PORT) || 3306,
        multipleStatements: true,
    });
}

export async function dbQuery(sql, params = []) {
    const conn = await getDbConnection();
    try {
        const [rows] = await conn.query(sql, params);
        return rows;
    } finally {
        await conn.end();
    }
}

// --------------------------------------------------------------------------- //
// Test users                                                                  //
// --------------------------------------------------------------------------- //
export function uniqueEmail(prefix = "user") {
    return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@trackr.test`;
}

export function uniqueCode(prefix = "TST") {
    return `${prefix}${Math.floor(Math.random() * 9000 + 1000)}`;
}

// Registers a student via the real API, then logs in and returns the token +
// user object. Role is always "student" because /auth/register hard-codes it.
//
// A 409 here is a genuine failure, not something to tolerate: uniqueEmail()
// includes a timestamp and a random suffix, so a collision means something
// else is wrong. Swallowing it would produce a confusing login error later.
export async function registerAndLoginStudent(overrides = {}) {
    const email = overrides.email || uniqueEmail("student");
    const password = overrides.password || DEFAULT_PASSWORD;

    const reg = await api("POST", "/auth/register", {
        body: {
            first_name: overrides.first_name || "Test",
            last_name: overrides.last_name || "Student",
            email,
            password,
        },
    });
    if (reg.status !== 201) {
        throw new Error(`register failed (${reg.status}): ${JSON.stringify(reg.body)}`);
    }

    const login = await api("POST", "/auth/login", { body: { email, password } });
    if (login.status !== 200) {
        throw new Error(`login failed (${login.status}): ${JSON.stringify(login.body)}`);
    }
    return { token: login.body.token, user: login.body.user, email, password };
}

// Registers a user, promotes them to admin directly in the DB (the API has no
// way to create an admin), then logs in again so the JWT carries role=admin.
export async function createAdminAndLogin() {
    const email = uniqueEmail("admin");
    const password = DEFAULT_PASSWORD;

    const reg = await api("POST", "/auth/register", {
        body: { first_name: "Dev", last_name: "Admin", email, password },
    });
    if (reg.status !== 201) {
        throw new Error(`admin register failed (${reg.status}): ${JSON.stringify(reg.body)}`);
    }

    await dbQuery("UPDATE users SET role = 'admin' WHERE email = ?", [email]);

    const login = await api("POST", "/auth/login", { body: { email, password } });
    if (login.status !== 200) {
        throw new Error(`admin login failed (${login.status})`);
    }
    if (login.body.user?.role !== "admin") {
        throw new Error(`expected role=admin in JWT payload, got "${login.body.user?.role}"`);
    }
    return { token: login.body.token, user: login.body.user, email, password };
}

// --------------------------------------------------------------------------- //
// Token helpers                                                               //
// --------------------------------------------------------------------------- //
// The secret must be the same one the *running server* is using. run-tests.js
// loads backend/.env.test and passes it down through the environment, so
// process.env wins. The .env fallback only matters if a test file is run
// directly without the harness script.
function readJwtSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

    const envPath = path.join(BACKEND_ROOT, ".env");
    const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    const match = content.match(/^JWT_SECRET=(.*)$/m);
    if (!match) {
        throw new Error("[harness] JWT_SECRET not found in env or backend/.env");
    }
    return match[1].trim().replace(/^["']|["']$/g, "");
}

// Validly signed but already expired — SEC-03 must fail on expiry, not on a
// bad signature, or the test proves nothing.
export function mintExpiredToken(user_id = 1, role = "student") {
    return jwt.sign({ user_id, role }, readJwtSecret(), { expiresIn: "-10s" });
}

// --------------------------------------------------------------------------- //
// Seed data for a student (course + two activities: one upcoming, one overdue) //
// --------------------------------------------------------------------------- //
// Returns { courseId, course }. Uses the real API so it also exercises addCourse.
export async function seedCourseWithActivities(token, tag = "") {
    const dt = (offsetDays) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
    };

    const res = await api("POST", "/user/courses/", {
        token,
        body: {
            course: {
                course_code: uniqueCode("TST"),
                course_name: `Test Course ${tag}`,
                term: "Spring 2026",
            },
            activities: [
                {
                    activity_name: `Upcoming ${tag}`,
                    activity_category_id: 1,
                    due_date: dt(1), // tomorrow, ungraded -> upcoming
                    grading_weight: 10,
                },
                {
                    activity_name: `Overdue ${tag}`,
                    activity_category_id: 1,
                    due_date: dt(-1), // yesterday, ungraded -> overdue
                    grading_weight: 10,
                },
            ],
        },
    });
    if (res.status !== 201) {
        throw new Error(`seed course failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
    return { courseId: res.body.course.course_id, course: res.body.course };
}