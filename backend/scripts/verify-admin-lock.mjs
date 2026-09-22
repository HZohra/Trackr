// backend/scripts/verify-admin-lock.mjs
//
// Regression check for Phase 0 #1: proves the public API cannot mint an admin.
// Run against a live dev server (backend + DB must be up):
//
//   node scripts/verify-admin-lock.mjs
//
// Override the target with API_BASE=... if not on http://localhost:5000.
// Self-cleaning: deletes the throwaway account it creates.

const BASE = process.env.API_BASE || "http://localhost:5000";
const email = `admin-lock-test+${Date.now()}@example.com`;
const password = "TestPassw0rd!";

const req = (method, path, { body, token } = {}) =>
    fetch(`${BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

const fail = (m) => {
    console.error(`FAIL: ${m}`);
    process.exit(1);
};

// The attack: register while explicitly asking for role "admin".
const reg = await req("POST", "/auth/register", {
    body: { first_name: "Admin", last_name: "Lock", email, password, role: "admin" },
});
if (reg.status !== 201) fail(`register returned ${reg.status}, expected 201`);

const login = await req("POST", "/auth/login", { body: { email, password } });
if (login.status !== 200) fail(`login returned ${login.status}, expected 200`);
const data = await login.json();

// Clean up the throwaway account no matter the result.
if (data?.token) {
    await req("DELETE", "/user/account", { token: data.token }).catch(() => {});
}

if (data?.user?.role !== "student") {
    fail(`new account role="${data?.user?.role}", expected "student" — ADMIN LOCK IS BROKEN`);
}

console.log('PASS: public registration produced role="student" even when role:"admin" was sent.');