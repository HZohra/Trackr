// tests/admin.test.js  —  Admin read endpoints (/admin, JWT + admin role)
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import {
    api,
    createAdminAndLogin,
    registerAndLoginStudent,
    seedCourseWithActivities,
} from "./helpers/harness.js";

describe("Admin (/admin)", () => {
    let admin;
    let knownUserId;
    let knownCourseId;

    before(async () => {
        admin = await createAdminAndLogin();

        // Seed our own fixtures rather than sampling body[0] from the list
        // endpoints. Sampling made ADM-02/ADM-04 skip themselves whenever the
        // list came back empty — a skipped test looks like coverage but proves
        // nothing, and the skip was silent. With a seeded student and course we
        // know exactly what must appear.
        const student = await registerAndLoginStudent();
        knownUserId = student.user.user_id;

        const seeded = await seedCourseWithActivities(student.token, "A");
        knownCourseId = seeded.courseId;
    });

    test("ADM-01 list all users -> 200, includes the seeded student", async () => {
        const res = await api("GET", "/admin/users/", { token: admin.token });
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.ok(
            res.body.some((u) => u.user_id === knownUserId),
            "admin list must contain the seeded student",
        );
        assert.ok(
            res.body.every((u) => u.password_hash === undefined),
            "admin list must not expose password hashes",
        );
    });

    test("ADM-02 get single user -> 200, correct user", async () => {
        const res = await api("GET", `/admin/users/${knownUserId}`, { token: admin.token });
        assert.equal(res.status, 200);
        assert.equal(res.body.user_id, knownUserId);
    });

    test("ADM-03 list all courses -> 200, includes the seeded course", async () => {
        const res = await api("GET", "/admin/courses/", { token: admin.token });
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.ok(res.body.some((c) => c.course_id === knownCourseId));
    });

    test("ADM-04 get single course -> 200, correct course", async () => {
        const res = await api("GET", `/admin/courses/${knownCourseId}`, { token: admin.token });
        assert.equal(res.status, 200);
        assert.equal(res.body.course_id, knownCourseId);
    });

    test("ADM-05 global statistics -> 200, aggregate object", async () => {
        const res = await api("GET", "/admin/statistics/", { token: admin.token });
        assert.equal(res.status, 200);
        assert.ok(res.body && typeof res.body === "object" && !Array.isArray(res.body));
        assert.ok(Object.keys(res.body).length > 0, "statistics payload must not be empty");
    });

    test("ADM-06 all user activities -> 200, spans users", async () => {
        const res = await api("GET", "/admin/user-activities/", { token: admin.token });
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.ok(res.body.length >= 2, "seeded course contributed two activities");
    });

    test("ADM-07 unknown user id -> 404, not a 500", async () => {
        const res = await api("GET", "/admin/users/99999999", { token: admin.token });
        assert.ok(
            [404, 400].includes(res.status),
            `expected a 4xx for a missing record, got ${res.status}`,
        );
    });
});