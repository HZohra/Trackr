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
    return { res, email, password };
}

export function loginStudent(email, password) {
    return api("POST", "/auth/login", { body: { email, password } });
}

export const dbQuery = (sql, params = []) => pgPool.query(sql, params);