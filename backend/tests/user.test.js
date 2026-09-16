// tests/user.test.js  —  User workflow (/user, JWT required)
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import {
    api,
    uploadFile,
    uniqueCode,
    registerAndLoginStudent,
    seedCourseWithActivities,
    MINIMAL_PDF,
} from "./helpers/harness.js";

describe("User workflow (/user)", () => {
    let student; // { token, user }
    let other; // a second student, for cross-user access tests
    let seededCourseId;

    before(async () => {
        student = await registerAndLoginStudent();
        other = await registerAndLoginStudent();
        const seeded = await seedCourseWithActivities(student.token, "U");
        seededCourseId = seeded.courseId;
    });

    test("USER-01 get my courses -> 200, scoped to me only", async () => {
        const mine = await api("GET", "/user/courses", { token: student.token });
        assert.equal(mine.status, 200);
        assert.ok(Array.isArray(mine.body));
        assert.ok(mine.body.some((c) => c.course_id === seededCourseId));

        // The real requirement is isolation, not "at least one row" — a broken
        // endpoint that returns every course in the table would pass a length
        // check. Confirm the other student cannot see this course in their list.
        const theirs = await api("GET", "/user/courses", { token: other.token });
        assert.equal(theirs.status, 200);
        assert.ok(
            !theirs.body.some((c) => c.course_id === seededCourseId),
            "another user's course list must not contain my course",
        );
    });

    test("USER-02 get my activities -> 200, scoped to me only", async () => {
        const mine = await api("GET", "/user/activities", { token: student.token });
        assert.equal(mine.status, 200);
        assert.ok(Array.isArray(mine.body));
        assert.ok(mine.body.length >= 2, "seeded one upcoming + one overdue activity");

        const theirs = await api("GET", "/user/activities", { token: other.token });
        assert.equal(theirs.status, 200);
        assert.equal(theirs.body.length, 0, "second student has seeded nothing");
    });

    test("USER-03 statistics reflect seeded upcoming + overdue", async () => {
        const res = await api("GET", "/user/statistics", { token: student.token });
        assert.equal(res.status, 200);
        assert.ok(Number(res.body.total_courses) >= 1);
        assert.ok(Number(res.body.upcoming) >= 1, "expected >=1 upcoming");
        assert.ok(Number(res.body.overdue) >= 1, "expected >=1 overdue");
    });

    test("USER-04 get single course I own -> 200", async () => {
        const res = await api("GET", `/user/courses/${seededCourseId}`, { token: student.token });
        assert.equal(res.status, 200);
        assert.equal(res.body.course_id, seededCourseId);
    });

    test("USER-05 get course I don't own -> 403/404, no data leak", async () => {
        const res = await api("GET", `/user/courses/${seededCourseId}`, { token: other.token });
        assert.ok([403, 404].includes(res.status), `got ${res.status}`);
        assert.notEqual(res.body?.course_id, seededCourseId, "must not return the course body");
    });

    test("USER-06 get activities for a course -> 200, scoped to user + course", async () => {
        const res = await api("GET", `/user/courses/${seededCourseId}/activities`, {
            token: student.token,
        });
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.ok(
            res.body.every((a) => a.course_id === seededCourseId),
            "every activity must belong to the requested course",
        );

        // Sorted by due date — US-05 acceptance criterion, verified via the
        // response order rather than by reading the SQL.
        const dates = res.body.map((a) => new Date(a.due_date).getTime());
        assert.deepEqual(dates, [...dates].sort((a, b) => a - b), "activities must be date-ordered");
    });

    test("USER-07 add course -> 201, appears in my list", async () => {
        // Randomised so a re-run against a non-reset database still passes.
        const code = uniqueCode("ADD");
        const res = await api("POST", "/user/courses/", {
            token: student.token,
            body: {
                course: { course_code: code, course_name: "Added Course", term: "Spring 2026" },
            },
        });
        assert.equal(res.status, 201);

        const list = await api("GET", "/user/courses", { token: student.token });
        assert.ok(list.body.some((c) => c.course_code === code));
    });

    test("USER-08 add course with invalid fields -> 400, no row created", async () => {
        const before = await api("GET", "/user/courses", { token: student.token });

        const res = await api("POST", "/user/courses/", {
            token: student.token,
            body: { course: { course_code: "", course_name: "", term: "" } },
        });
        assert.equal(res.status, 400);

        const after = await api("GET", "/user/courses", { token: student.token });
        assert.equal(after.body.length, before.body.length, "rejected payload must not persist");
    });

    test("USER-09 upload a valid syllabus PDF -> 200, receipt confirmed", async () => {
        const res = await uploadFile("/user/upload-syllabus", {
            token: student.token,
            filename: "syllabus.pdf",
            content: MINIMAL_PDF,
            type: "application/pdf",
        });
        // Controller is a stub: this asserts file acceptance only, not parsing.
        assert.equal(res.status, 200, JSON.stringify(res.body));
    });

    test("USER-10a upload with no file -> 400", async () => {
        const res = await api("POST", "/user/upload-syllabus", {
            token: student.token,
            body: {},
        });
        assert.equal(res.status, 400);
    });

    test("USER-10b upload a disallowed file type -> rejected without crashing", async () => {
        const res = await uploadFile("/user/upload-syllabus", {
            token: student.token,
            filename: "payload.exe",
            content: "MZ\x90\x00", // DOS executable header
            type: "application/x-msdownload",
        });
        assert.ok(res.status >= 400 && res.status < 500, `expected a 4xx, got ${res.status}`);

        // The point of this case is that a bad upload does not take the server
        // down — the next request must still be served.
        const alive = await api("GET", "/user/courses", { token: student.token });
        assert.equal(alive.status, 200, "server must still be responding after a bad upload");
    });

    test("USER-11 view my profile -> 200, no hash leaked", async () => {
        const res = await api("GET", `/user/${student.user.user_id}/profile`, {
            token: student.token,
        });
        assert.equal(res.status, 200);
        assert.equal(res.body.password_hash, undefined);
    });

    test("USER-12 update my profile -> changes persist", async () => {
        const upd = await api("PUT", `/user/${student.user.user_id}/profile`, {
            token: student.token,
            body: { profile: { institution: "Wilfrid Laurier University" } },
        });
        assert.equal(upd.status, 200);

        const check = await api("GET", `/user/${student.user.user_id}/profile`, {
            token: student.token,
        });
        assert.equal(check.body.institution, "Wilfrid Laurier University");
    });

    test("USER-13 cannot modify another user's profile", async () => {
        // The controller derives identity from req.user.user_id and ignores the
        // :id path param, so this request may legitimately return 200 while
        // writing to the *attacker's own* row. Both 403 and "200 but wrote to
        // self" are safe outcomes; asserting a status code would fail a backend
        // that is actually secure. Assert the security property instead: the
        // victim's row must be unchanged.
        const res = await api("PUT", `/user/${student.user.user_id}/profile`, {
            token: other.token, // attacker's token, victim's id in the path
            body: { profile: { institution: "HACKED" } },
        });

        const victim = await api("GET", `/user/${student.user.user_id}/profile`, {
            token: student.token,
        });
        assert.notEqual(
            victim.body.institution,
            "HACKED",
            `victim profile was overwritten (attacker request returned ${res.status})`,
        );
        assert.equal(victim.body.institution, "Wilfrid Laurier University");
    });
});