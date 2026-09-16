// tests/security.test.js  —  Access control + input safety
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import {
    api,
    registerAndLoginStudent,
    mintExpiredToken,
    uniqueCode,
    dbQuery,
} from "./helpers/harness.js";

describe("Security & access control", () => {
    let student;

    before(async () => {
        student = await registerAndLoginStudent();
    });

    test("SEC-01 no token on protected route -> 401", async () => {
        const res = await api("GET", "/user/courses");
        assert.equal(res.status, 401);
    });

    // SEC-02 / SEC-03 assert 401 strictly, matching the test plan.
    //
    // 401 means "I don't know who you are"; 403 means "I know who you are and
    // the answer is no". A missing, malformed, or expired credential is always
    // the former. The original middleware returned 403 whenever jwt.verify()
    // threw, which conflated the two — the fix is in middleware/auth.js
    // (verifyToken now returns 401 on a verify failure and reserves 403 for
    // requireAdmin). If these two fail, the middleware change has not landed.
    test("SEC-02 malformed token -> 401", async () => {
        const res = await api("GET", "/user/courses", { token: "abc123" });
        assert.equal(res.status, 401);
    });

    test("SEC-03 expired but validly signed token -> 401", async () => {
        const expired = mintExpiredToken(student.user.user_id, "student");
        const res = await api("GET", "/user/courses", { token: expired });
        assert.equal(res.status, 401, "must reject on expiry, not accept a stale session");
    });

    test("SEC-04 student token on admin route -> 403", async () => {
        const res = await api("GET", "/admin/users/", { token: student.token });
        assert.equal(res.status, 403);
    });

    test("SEC-05a SQL injection in login is treated as plain text (no bypass)", async () => {
        const res = await api("POST", "/auth/login", {
            body: { email: "' OR '1'='1", password: "' OR '1'='1" },
        });
        assert.ok([400, 401].includes(res.status), `auth bypass: got ${res.status}`);
        assert.equal(res.body?.token, undefined, "no token may be issued");

        const rows = await dbQuery("SHOW TABLES LIKE 'users'");
        assert.equal(rows.length, 1, "users table must still exist");
    });

    test("SEC-05b SQL injection in a write path leaves the schema intact", async () => {
        // The login path is read-only; the interesting case is a value that
        // reaches an INSERT. Parameterised queries must store this as a literal
        // string rather than executing it.
        const payload = "'; DROP TABLE users;--";
        const res = await api("POST", "/user/courses/", {
            token: student.token,
            body: {
                course: { course_code: uniqueCode("INJ"), course_name: payload, term: "Spring 2026" },
            },
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.course.course_name, payload, "stored verbatim as text");

        const tables = await dbQuery("SHOW TABLES LIKE 'users'");
        assert.equal(tables.length, 1, "users table must still exist");

        const activities = await dbQuery("SHOW TABLES LIKE 'activities'");
        assert.equal(activities.length, 1, "activities table must still exist");
    });

    test("SEC-06 XSS payload is stored and returned as inert data", async () => {
        const payload = "<script>alert(1)</script>";
        const create = await api("POST", "/user/courses/", {
            token: student.token,
            body: {
                course: { course_code: uniqueCode("XSS"), course_name: payload, term: "Spring 2026" },
            },
        });
        assert.equal(create.status, 201);

        // Round-trips as a string. Whether the browser executes it depends on
        // the rendering layer (textContent vs innerHTML) — that half of SEC-06
        // is a manual UI check and is recorded as such in the report.
        assert.equal(create.body.course.course_name, payload);

        const contentType = create.headers.get("content-type") || "";
        assert.match(contentType, /application\/json/, "JSON response, not HTML");
    });

    test("SEC-07 CORS does not reflect an arbitrary origin", async () => {
        const evilOrigin = "https://evil.example.com";
        const res = await api("GET", "/user/courses", {
            token: student.token,
            headers: { Origin: evilOrigin },
        });

        const allowOrigin = res.headers.get("access-control-allow-origin");
        const allowCredentials = res.headers.get("access-control-allow-credentials");

        // Reflecting the caller's origin back is the dangerous configuration,
        // especially combined with credentials. A wildcard is permissive but
        // cannot carry credentials, so it is recorded as a limitation rather
        // than a failure — see Known Issues in the report.
        assert.notEqual(
            allowOrigin,
            evilOrigin,
            "server echoed an arbitrary origin into Access-Control-Allow-Origin",
        );
        if (allowOrigin === "*") {
            assert.notEqual(
                allowCredentials,
                "true",
                "wildcard origin must never be combined with credentials",
            );
        }
    });

    test("SEC-08 admin routes reject an anonymous request -> 401", async () => {
        // SEC-04 covers "wrong role"; this covers "no credential at all", which
        // is a different branch of the middleware chain.
        for (const route of ["/admin/users/", "/admin/courses/", "/admin/statistics/"]) {
            const res = await api("GET", route);
            assert.equal(res.status, 401, `${route} returned ${res.status}`);
        }
    });
});