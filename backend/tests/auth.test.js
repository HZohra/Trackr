// tests/auth.test.js  —  Authentication (/auth)
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { api, uniqueEmail, dbQuery, DEFAULT_PASSWORD } from "./helpers/harness.js";

describe("Authentication (/auth)", () => {
    const email = uniqueEmail("auth");
    const password = DEFAULT_PASSWORD;

    // Captured in AUTH-06 and compared in AUTH-07. The security property under
    // test is that a wrong password and an unknown account are indistinguishable
    // to the caller — same status AND same body. Asserting only "both are 401"
    // would pass even if one said "user not found" and the other "bad password",
    // which is exactly the account-enumeration leak the plan is guarding against.
    let wrongPasswordResponse;

    test("AUTH-01 register new user -> 201, row created", async () => {
        const res = await api("POST", "/auth/register", {
            body: { first_name: "Auth", last_name: "One", email, password },
        });
        assert.equal(res.status, 201);

        const rows = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
        assert.equal(rows.length, 1);
    });

    test("AUTH-02 register duplicate email -> 409, no second row", async () => {
        const res = await api("POST", "/auth/register", {
            body: { first_name: "Auth", last_name: "Dup", email, password },
        });
        assert.equal(res.status, 409);

        const rows = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
        assert.equal(rows.length, 1);
    });

    test("AUTH-03 register invalid email format -> 400, no row created", async () => {
        const badEmail = "not-an-email";
        const res = await api("POST", "/auth/register", {
            body: { first_name: "Bad", last_name: "Email", email: badEmail, password },
        });
        assert.equal(res.status, 400);

        const rows = await dbQuery("SELECT * FROM users WHERE email = ?", [badEmail]);
        assert.equal(rows.length, 0, "rejected registration must not create a row");
    });

    test("AUTH-04 register missing fields -> 400", async () => {
        const res = await api("POST", "/auth/register", { body: {} });
        assert.equal(res.status, 400);
    });

    test("AUTH-05 login valid credentials -> 200 with token + user.role", async () => {
        const res = await api("POST", "/auth/login", { body: { email, password } });
        assert.equal(res.status, 200);
        assert.ok(res.body.token, "expected a JWT");
        assert.ok(res.body.user, "expected a user object");
        assert.equal(res.body.user.role, "student");
        assert.equal(res.body.user.password_hash, undefined, "must not leak hash");
    });

    test("AUTH-06 login wrong password -> 401 generic", async () => {
        const res = await api("POST", "/auth/login", { body: { email, password: "wrong" } });
        assert.equal(res.status, 401);
        wrongPasswordResponse = res;
    });

    test("AUTH-07 login non-existent email -> identical response to AUTH-06", async () => {
        const res = await api("POST", "/auth/login", {
            body: { email: uniqueEmail("ghost"), password },
        });
        assert.equal(res.status, 401);

        assert.ok(wrongPasswordResponse, "AUTH-06 must run first");
        assert.equal(
            res.status,
            wrongPasswordResponse.status,
            "status must not reveal whether the account exists",
        );
        assert.deepEqual(
            res.body,
            wrongPasswordResponse.body,
            "error body must not reveal whether the account exists",
        );
    });

    test("AUTH-11 password stored hashed, never plaintext", async () => {
        const rows = await dbQuery("SELECT password_hash FROM users WHERE email = ?", [email]);
        const hash = rows[0].password_hash;
        assert.notEqual(hash, password);
        assert.match(hash, /^\$2[aby]\$/, "expected a bcrypt hash");
    });

    // --- Forgot / reset password ---------------------------------------- //
    // These three are blocked, not passing. They are declared and skipped with
    // a stated reason so the run output and the report agree: a documented skip
    // is evidence of a known gap; silently omitting the case is not.
    //
    // Blockers (see Known Issues in the testing report):
    //   KI-02  /auth/forgot-password never calls res.send/json — the request
    //          hangs until the client aborts.
    //   KI-03  the password_reset_tokens table is absent from db/db_init.sql,
    //          so no valid reset token can exist.
    // Remove the skip option once either is fixed; the assertions are already
    // written against the intended behaviour.

    test(
        "AUTH-08 forgot-password with existing email -> 200",
        { skip: "KI-02: handler never sends a response; request times out" },
        async () => {
            const res = await api("POST", "/auth/forgot-password", { body: { email } });
            assert.equal(res.status, 200);
        },
    );

    test(
        "AUTH-08b forgot-password with unknown email -> 200 (no account enumeration)",
        { skip: "KI-02: handler never sends a response; request times out" },
        async () => {
            const res = await api("POST", "/auth/forgot-password", {
                body: { email: uniqueEmail("ghost") },
            });
            assert.equal(res.status, 200);
        },
    );

    test(
        "AUTH-09 reset-password with a valid token -> 200, new password works",
        { skip: "KI-03: password_reset_tokens table does not exist in db/db_init.sql" },
        async () => {
            // Intended shape once the table exists: read the token straight from
            // the DB (no mail delivery in the test environment), post it with a
            // new password, then confirm old fails / new succeeds.
            const [row] = await dbQuery(
                "SELECT token FROM password_reset_tokens WHERE email = ? ORDER BY id DESC LIMIT 1",
                [email],
            );
            const newPassword = "Trackr2026!new";

            const reset = await api("POST", "/auth/reset-password", {
                body: { token: row.token, password: newPassword },
            });
            assert.equal(reset.status, 200);

            const oldLogin = await api("POST", "/auth/login", { body: { email, password } });
            assert.equal(oldLogin.status, 401, "old password must stop working");

            const newLogin = await api("POST", "/auth/login", {
                body: { email, password: newPassword },
            });
            assert.equal(newLogin.status, 200, "new password must work");
        },
    );

    test(
        "AUTH-10 reset-password with a bad token -> 400, password unchanged",
        { skip: "KI-03: password_reset_tokens table does not exist in db/db_init.sql" },
        async () => {
            const res = await api("POST", "/auth/reset-password", {
                body: { token: "definitely-not-a-real-token", password: "Whatever2026!" },
            });
            assert.equal(res.status, 400);

            const stillWorks = await api("POST", "/auth/login", { body: { email, password } });
            assert.equal(stillWorks.status, 200, "password must be unchanged");
        },
    );
});