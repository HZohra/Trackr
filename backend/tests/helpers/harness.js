import { app } from "../../app.js";
import { pgPool } from "../../src/config/db.js";
import { initJWTSecret } from "../../src/middleware/auth.js";

let server;
let baseUrl = "";

export async function startServer() {
    initJWTSecret(); // reads JWT_SECRET set by setup.mjs
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    return baseUrl;
}

export async function stopServer() {
    // Tidy up the test rows we created, then close everything.
    try {
        await pgPool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
    } catch {
        /* ignore cleanup errors */
    }
    if (server) await new Promise((resolve) => server.close(resolve));
    await pgPool.end();
}

export async function api(method, path, { body, token } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed = null;
    if (text) {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }
    }
    return { status: res.status, body: parsed, headers: res.headers };
}

export const uniqueEmail = (prefix = "user") =>
    `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2, 8)}@example.com`;

export async function registerStudent(overrides = {}) {
    const email = overrides.email || uniqueEmail("student");
    const password = overrides.password || "Passw0rd!";
    const res = await api("POST", "/auth/register", {
        body: { first_name: "Test", last_name: "User", email, password, ...overrides },
    });
    // Block-until-verified is on; auto-verify test users so login works. Tests
    // that exercise the verification flow register via api() directly instead.
    await pgPool.query("UPDATE users SET email_verified = TRUE WHERE email = $1", [email]);
    return { res, email, password };
}

export function loginStudent(email, password) {
    return api("POST", "/auth/login", { body: { email, password } });
}

export const dbQuery = (sql, params = []) => pgPool.query(sql, params);

export async function createCourse(userId, overrides = {}) {
    const { rows } = await pgPool.query(
        `INSERT INTO courses (user_id, course_code, course_name, term)
         VALUES ($1, $2, $3, $4) RETURNING course_id`,
        [
            userId,
            overrides.code ?? "C" + Math.random().toString(36).slice(2, 7),
            overrides.name ?? "Test Course",
            overrides.term ?? "Fall 2026",
        ],
    );
    return rows[0].course_id;
}

export async function createActivity(courseId, overrides = {}) {
    const due = overrides.due ?? new Date(Date.now() + 86_400_000).toISOString();
    const { rows } = await pgPool.query(
        `INSERT INTO activities (course_id, activity_category_id, activity_name, due_date, grading_weight, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING activity_id`,
        [
            courseId,
            overrides.categoryId ?? 1,
            overrides.name ?? "Task " + Math.random().toString(36).slice(2, 7),
            due,
            overrides.weight ?? 10,
            overrides.status ?? "not_started",
        ],
    );
    return rows[0].activity_id;
}

export async function postUpload(token, { content, filename = "syllabus.pdf", type = "application/pdf" }) {
    const form = new FormData();
    form.append("file", new Blob([content], { type }), filename);
    const res = await fetch(`${baseUrl}/user/upload-syllabus`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    });
    const text = await res.text();
    let parsed = null;
    if (text) {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }
    }
    return { status: res.status, body: parsed };
}