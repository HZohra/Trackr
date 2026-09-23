import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { testOutbox } from "../src/services/mailer.js";
import {
    api,
    loginStudent,
    registerStudent,
    startServer,
    stopServer,
    uniqueEmail,
} from "./helpers/harness.js";

before(startServer);
after(stopServer);

test("GET /health -> 200", async () => {
    const res = await api("GET", "/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
});

test("security headers are set (helmet)", async () => {
    const res = await api("GET", "/health");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-powered-by"), null); // helmet strips this
});

describe("Registration", () => {
    test("weak password -> 400", async () => {
        const res = await api("POST", "/auth/register", {
            body: { first_name: "A", last_name: "B", email: uniqueEmail(), password: "weak" },
        });
        assert.equal(res.status, 400);
    });

    test("missing fields -> 400", async () => {
        const res = await api("POST", "/auth/register", { body: { email: uniqueEmail() } });
        assert.equal(res.status, 400);
    });

    test("strong password -> 201 and role is student", async () => {
        const { res } = await registerStudent();
        assert.equal(res.status, 201);
        assert.equal(res.body.user.role, "student");
    });

    test("client-set role:admin is ignored (admin lock)", async () => {
        const email = uniqueEmail("adminlock");
        const reg = await api("POST", "/auth/register", {
            body: { first_name: "A", last_name: "B", email, password: "Passw0rd!", role: "admin" },
        });
        assert.equal(reg.status, 201);
        const login = await loginStudent(email, "Passw0rd!");
        assert.equal(login.body.user.role, "student");
    });

    test("duplicate email -> 409", async () => {
        const { email } = await registerStudent();
        const dup = await api("POST", "/auth/register", {
            body: { first_name: "A", last_name: "B", email, password: "Passw0rd!" },
        });
        assert.equal(dup.status, 409);
    });
});

describe("Login", () => {
    test("wrong password -> 401", async () => {
        const { email } = await registerStudent();
        const res = await loginStudent(email, "Wrongpass0!");
        assert.equal(res.status, 401);
    });

    test("correct password -> 200 with a token", async () => {
        const { email, password } = await registerStudent();
        const res = await loginStudent(email, password);
        assert.equal(res.status, 200);
        assert.ok(res.body.token);
    });
});

describe("Protected routes & tokens", () => {
    test("no token -> 401", async () => {
        assert.equal((await api("GET", "/user/courses")).status, 401);
    });
    test("garbage token -> 401", async () => {
        assert.equal(
            (await api("GET", "/user/courses", { token: "not-a-real-token" })).status,
            401,
        );
    });
    test("student token on admin route -> 403", async () => {
        const { email, password } = await registerStudent();
        const login = await loginStudent(email, password);
        const res = await api("GET", "/admin/users/", { token: login.body.token });
        assert.equal(res.status, 403);
    });
});

describe("Forgot / reset password", () => {
    test("unknown email -> generic 202 (no enumeration)", async () => {
        const res = await api("POST", "/auth/forgot-password", {
            body: { email: uniqueEmail("nobody") },
        });
        assert.equal(res.status, 202);
    });

    test("full reset flow: request -> reset -> old dies, new works, token single-use", async () => {
        const { email, password } = await registerStudent();
        testOutbox.length = 0;

        const forgot = await api("POST", "/auth/forgot-password", { body: { email } });
        assert.equal(forgot.status, 202);

        const mail = testOutbox.at(-1);
        assert.ok(mail, "a reset email should have been queued");
        const url = mail.text.match(/https?:\/\/\S+/)[0];
        const token = new URL(url).searchParams.get("token");
        assert.ok(token, "reset link should carry a token");

        const weak = await api("POST", `/auth/reset-password/${token}`, {
            body: { password: "weak" },
        });
        assert.equal(weak.status, 400);

        const reset = await api("POST", `/auth/reset-password/${token}`, {
            body: { password: "Newpass0!" },
        });
        assert.equal(reset.status, 200);

        assert.equal((await loginStudent(email, password)).status, 401);
        assert.equal((await loginStudent(email, "Newpass0!")).status, 200);

        const reuse = await api("POST", `/auth/reset-password/${token}`, {
            body: { password: "Newpass0!" },
        });
        assert.equal(reuse.status, 400);
    });
});

describe("Change password (logged in)", () => {
    async function freshSession() {
        const { email, password } = await registerStudent();
        const login = await loginStudent(email, password);
        return { email, password, token: login.body.token };
    }

    test("wrong current password -> 401", async () => {
        const s = await freshSession();
        const res = await api("PUT", "/user/change-password", {
            token: s.token,
            body: { currentPassword: "Wrongpass0!", newPassword: "Newpass0!" },
        });
        assert.equal(res.status, 401);
    });

    test("weak new password -> 400", async () => {
        const s = await freshSession();
        const res = await api("PUT", "/user/change-password", {
            token: s.token,
            body: { currentPassword: s.password, newPassword: "weak" },
        });
        assert.equal(res.status, 400);
    });

    test("correct -> 200 and the new password works", async () => {
        const s = await freshSession();
        const res = await api("PUT", "/user/change-password", {
            token: s.token,
            body: { currentPassword: s.password, newPassword: "Newpass0!" },
        });
        assert.equal(res.status, 200);
        assert.equal((await loginStudent(s.email, "Newpass0!")).status, 200);
    });
});

describe("Session invalidation on password change/reset", () => {
    test("change-password: old token dies, returned token works", async () => {
        const { email, password } = await registerStudent();
        const login = await loginStudent(email, password);
        const oldToken = login.body.token;
        const userId = login.body.user.user_id;

        // old token works before the change
        assert.equal(
            (await api("GET", `/user/${userId}/profile`, { token: oldToken })).status,
            200,
        );

        const change = await api("PUT", "/user/change-password", {
            token: oldToken,
            body: { currentPassword: password, newPassword: "Newpass0!" },
        });
        assert.equal(change.status, 200);
        assert.ok(change.body.token, "change-password should return a fresh token");

        // old token is now rejected
        assert.equal(
            (await api("GET", `/user/${userId}/profile`, { token: oldToken })).status,
            401,
        );
        // the freshly returned token works
        assert.equal(
            (await api("GET", `/user/${userId}/profile`, { token: change.body.token })).status,
            200,
        );
    });

    test("reset: a session issued before the reset is invalidated", async () => {
        const { email, password } = await registerStudent();
        const login = await loginStudent(email, password);
        const oldToken = login.body.token;
        const userId = login.body.user.user_id;

        testOutbox.length = 0;
        await api("POST", "/auth/forgot-password", { body: { email } });
        const url = testOutbox.at(-1).text.match(/https?:\/\/\S+/)[0];
        const resetToken = new URL(url).searchParams.get("token");
        const reset = await api("POST", `/auth/reset-password/${resetToken}`, {
            body: { password: "Newpass0!" },
        });
        assert.equal(reset.status, 200);

        assert.equal(
            (await api("GET", `/user/${userId}/profile`, { token: oldToken })).status,
            401,
        );
    });
});