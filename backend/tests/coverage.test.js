// tests/coverage.test.js
//   Covers the endpoints that had no automated tests after the first run:
//     - activity CRUD          POST/PUT/DELETE /user/activities
//     - account deletion       DELETE /user/account
//     - OAuth endpoints        /auth/register/oauth, /auth/login/oauth
//     - admin recent activity  GET /admin/recent-activity/
//
// ---------------------------------------------------------------------------
// IF THE ACTIVITY TESTS FAIL WITH 400, READ THIS FIRST.
// The request body shape for POST /user/activities is a guess, modelled on
// addCourse, which takes { course: {...} }. If the controller expects a flat
// body instead, change activityBody() below — it is the ONLY place the shape
// is defined, so one edit fixes every test in this file.
// ---------------------------------------------------------------------------

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import {
    api,
    dbQuery,
    uniqueCode,
    uniqueEmail,
    registerAndLoginStudent,
    seedCourseWithActivities,
    createAdminAndLogin,
    DEFAULT_PASSWORD,
} from "./helpers/harness.js";

// Date helper: YYYY-MM-DD, n days from today.
const dt = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
};

// THE ONE PLACE the activity payload shape is defined.
function activityBody(courseId, overrides = {}) {
    return {
        activity: {
            course_id: courseId,
            activity_name: overrides.activity_name || `Activity ${uniqueCode("A")}`,
            activity_category_id: overrides.activity_category_id ?? 1,
            due_date: overrides.due_date || dt(7),
            grading_weight: overrides.grading_weight ?? 15,
            ...overrides,
        },
    };
}

// ===========================================================================
describe("Activity CRUD (/user/activities)", () => {
    let student;
    let other;
    let courseId;
    let createdActivityId;

    before(async () => {
        student = await registerAndLoginStudent();
        other = await registerAndLoginStudent();
        const seeded = await seedCourseWithActivities(student.token, "C");
        courseId = seeded.courseId;
    });

    test("USER-14 add an activity -> 201, appears in the course's activity list", async () => {
        const res = await api("POST", "/user/activities", {
            token: student.token,
            body: activityBody(courseId, { activity_name: "Midterm Exam" }),
        });
        assert.equal(res.status, 201, JSON.stringify(res.body));

        // Capture the id however the controller returns it.
        createdActivityId =
            res.body?.activity?.activity_id ?? res.body?.activity_id ?? res.body?.insertId;
        assert.ok(createdActivityId, `no activity id in response: ${JSON.stringify(res.body)}`);

        const list = await api("GET", `/user/courses/${courseId}/activities`, {
            token: student.token,
        });
        assert.ok(list.body.some((a) => a.activity_name === "Midterm Exam"));
    });

    test("USER-15 add an activity with missing fields -> 400, nothing created", async () => {
        const before = await api("GET", "/user/activities", { token: student.token });

        const res = await api("POST", "/user/activities", {
            token: student.token,
            body: { activity: { course_id: courseId, activity_name: "", due_date: "" } },
        });
        assert.equal(res.status, 400, `expected rejection, got ${res.status}`);

        const after = await api("GET", "/user/activities", { token: student.token });
        assert.equal(after.body.length, before.body.length, "rejected payload must not persist");
    });

    test("USER-16 add an activity to a course I do not own -> rejected", async () => {
        // Cross-user write. The activity must not land on the victim's course.
        const res = await api("POST", "/user/activities", {
            token: other.token,
            body: activityBody(courseId, { activity_name: "INJECTED" }),
        });

        const victimList = await api("GET", `/user/courses/${courseId}/activities`, {
            token: student.token,
        });
        assert.ok(
            !victimList.body.some((a) => a.activity_name === "INJECTED"),
            `another user wrote an activity into my course (status ${res.status})`,
        );
    });

    test("USER-17 update an activity / record a grade -> 200, value persists", async () => {
        const res = await api("PUT", `/user/activities/${createdActivityId}`, {
            token: student.token,
            body: { activity: { grade: 88, status: "graded" } },
        });
        assert.equal(res.status, 200, JSON.stringify(res.body));

        const list = await api("GET", `/user/courses/${courseId}/activities`, {
            token: student.token,
        });
        const updated = list.body.find((a) => a.activity_id === createdActivityId);
        assert.ok(updated, "activity disappeared after update");
        // DECIMAL columns come back from mysql2 as strings, so compare numerically.
        assert.equal(Number(updated.grade), 88);
    });

    test("USER-18 grade above 100 is rejected and not stored", async () => {
        const res = await api("PUT", `/user/activities/${createdActivityId}`, {
            token: student.token,
            body: { activity: { grade: 150 } },
        });

        // chk_activities_grade allows 0-100. A 400 means the controller validates;
        // a 500 means only the database is catching it. Either way the value must
        // not be stored — that is what this asserts. Record the actual status in
        // the report: 500 here is a real "input validation" finding.
        assert.ok(res.status >= 400, `invalid grade was accepted (status ${res.status})`);

        const list = await api("GET", `/user/courses/${courseId}/activities`, {
            token: student.token,
        });
        const row = list.body.find((a) => a.activity_id === createdActivityId);
        assert.notEqual(Number(row.grade), 150, "out-of-range grade was stored");
    });

    test("USER-19 update an activity I do not own -> victim's data unchanged", async () => {
        const res = await api("PUT", `/user/activities/${createdActivityId}`, {
            token: other.token,
            body: { activity: { activity_name: "HACKED", grade: 0 } },
        });

        const list = await api("GET", `/user/courses/${courseId}/activities`, {
            token: student.token,
        });
        const row = list.body.find((a) => a.activity_id === createdActivityId);
        assert.notEqual(
            row.activity_name,
            "HACKED",
            `another user modified my activity (status ${res.status})`,
        );
    });

    test("USER-20 delete an activity I do not own -> still there", async () => {
        const res = await api("DELETE", `/user/activities/${createdActivityId}`, {
            token: other.token,
        });

        const list = await api("GET", `/user/courses/${courseId}/activities`, {
            token: student.token,
        });
        assert.ok(
            list.body.some((a) => a.activity_id === createdActivityId),
            `another user deleted my activity (status ${res.status})`,
        );
    });

    test("USER-21 delete my own activity -> 200/204, gone from the list", async () => {
        const res = await api("DELETE", `/user/activities/${createdActivityId}`, {
            token: student.token,
        });
        assert.ok([200, 204].includes(res.status), `got ${res.status}`);

        const list = await api("GET", `/user/courses/${courseId}/activities`, {
            token: student.token,
        });
        assert.ok(!list.body.some((a) => a.activity_id === createdActivityId));
    });

    test("USER-22 delete an activity that does not exist -> 4xx, not a 500", async () => {
        const res = await api("DELETE", "/user/activities/99999999", { token: student.token });
        assert.ok(res.status >= 400 && res.status < 500, `expected a 4xx, got ${res.status}`);
    });
});

// ===========================================================================
describe("Course constraints", () => {
    let student;

    before(async () => {
        student = await registerAndLoginStudent();
    });

    test("USER-23 adding the same course code and term twice is rejected", async () => {
        // uq_courses_user_code_term is UNIQUE (user_id, course_code, term).
        const course = { course_code: uniqueCode("DUP"), course_name: "Dup Test", term: "Spring 2026" };

        const first = await api("POST", "/user/courses/", { token: student.token, body: { course } });
        assert.equal(first.status, 201);

        const second = await api("POST", "/user/courses/", { token: student.token, body: { course } });
        assert.ok(second.status >= 400, `duplicate course was accepted (status ${second.status})`);

        const list = await api("GET", "/user/courses", { token: student.token });
        const matches = list.body.filter((c) => c.course_code === course.course_code);
        assert.equal(matches.length, 1, "duplicate row was created");
    });
});

// ===========================================================================
describe("Account deletion (DELETE /user/account)", () => {
    let victim;
    let victimId;
    let courseId;

    before(async () => {
        // A throwaway account — this suite destroys it.
        victim = await registerAndLoginStudent();
        victimId = victim.user.user_id;
        const seeded = await seedCourseWithActivities(victim.token, "D");
        courseId = seeded.courseId;
    });

    test("USER-24 deleting my account removes my courses and activities (cascade)", async () => {
        // Confirm the data exists first, so a passing test cannot be vacuous.
        const coursesBefore = await dbQuery("SELECT * FROM courses WHERE user_id = ?", [victimId]);
        assert.ok(coursesBefore.length >= 1, "setup failed: no course to cascade");

        const activitiesBefore = await dbQuery(
            "SELECT * FROM activities WHERE course_id = ?",
            [courseId],
        );
        assert.ok(activitiesBefore.length >= 1, "setup failed: no activities to cascade");

        const res = await api("DELETE", "/user/account", { token: victim.token });
        assert.ok([200, 204].includes(res.status), `got ${res.status}`);

        const userRows = await dbQuery("SELECT * FROM users WHERE user_id = ?", [victimId]);
        assert.equal(userRows.length, 0, "user row still present");

        // FK ON DELETE CASCADE should have removed both dependent tables.
        const coursesAfter = await dbQuery("SELECT * FROM courses WHERE user_id = ?", [victimId]);
        assert.equal(coursesAfter.length, 0, "orphaned courses left behind");

        const activitiesAfter = await dbQuery(
            "SELECT * FROM activities WHERE course_id = ?",
            [courseId],
        );
        assert.equal(activitiesAfter.length, 0, "orphaned activities left behind");
    });

    test("USER-25 a token belonging to a deleted account no longer works", async () => {
        // The JWT is still cryptographically valid — the user behind it is gone.
        const res = await api("GET", "/user/courses", { token: victim.token });
        assert.ok(
            res.status >= 400,
            `a deleted user's token still returned ${res.status}`,
        );
    });
});

// ===========================================================================
describe("OAuth endpoints (/auth/*/oauth)", () => {
    // Google SSO routes exist. A full happy-path test would need a real Google
    // ID token, which cannot be minted in a test environment, so these cover
    // the rejection paths only — which is the part that matters for security.

    test("AUTH-12 OAuth register with a garbage credential -> 4xx, no user created", async () => {
        const before = await dbQuery("SELECT COUNT(*) AS n FROM users");

        const res = await api("POST", "/auth/register/oauth", {
            body: { credential: "not-a-real-google-token", email: uniqueEmail("oauth") },
        });
        assert.ok(res.status >= 400, `invalid Google token accepted (status ${res.status})`);

        const after = await dbQuery("SELECT COUNT(*) AS n FROM users");
        assert.equal(Number(after[0].n), Number(before[0].n), "a user was created anyway");
    });

    test("AUTH-13 OAuth login with a garbage credential -> 4xx, no token issued", async () => {
        const res = await api("POST", "/auth/login/oauth", {
            body: { credential: "not-a-real-google-token" },
        });
        assert.ok(res.status >= 400, `got ${res.status}`);
        assert.equal(res.body?.token, undefined, "a JWT was issued for an invalid Google token");
    });

    test("AUTH-14 OAuth login with an empty body -> 4xx", async () => {
        const res = await api("POST", "/auth/login/oauth", { body: {} });
        assert.ok(res.status >= 400, `got ${res.status}`);
    });
});

// ===========================================================================
describe("Admin — recent activity feed", () => {
    let admin;
    let student;

    before(async () => {
        admin = await createAdminAndLogin();
        student = await registerAndLoginStudent();
        await seedCourseWithActivities(student.token, "R");
    });

    test("ADM-08 recent activity -> 200 for an admin", async () => {
        const res = await api("GET", "/admin/recent-activity/", { token: admin.token });
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.ok(res.body !== null && res.body !== undefined);
    });

    test("ADM-09 recent activity rejects a student token -> 403", async () => {
        const res = await api("GET", "/admin/recent-activity/", { token: student.token });
        assert.equal(res.status, 403);
    });

    test("ADM-10 recent activity rejects an anonymous request -> 401", async () => {
        const res = await api("GET", "/admin/recent-activity/");
        assert.equal(res.status, 401);
    });
});