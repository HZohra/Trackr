/**
 * DB-safety layer between the AI extractor / client and the database.
 *
 * - normalizeExtraction: shapes raw extractor output for the review UI (keeps
 *   category as a NAME, injects the student-supplied term, clamps overlong text).
 * - validateCoursePayload: strict server-side guard for POST /user/courses —
 *   never trust the client. Enforces required fields, category IDs, enums, and
 *   DATETIME formatting before anything hits an INSERT.
 * - validateActivityPayload: the same guard for a single activity, used by
 *   POST /user/activities and by validateCoursePayload for each activity it gets.
 */

// activity_categories is: 1 Assignment, 2 Quiz, 3 Exam, 4 Project.
export const CATEGORY_NAME_TO_ID = {
    Assignment: 1,
    Quiz: 2,
    Exam: 3,
    Project: 4,
};

const VALID_CATEGORY_IDS = new Set([1, 2, 3, 4]);
const VALID_REMINDER_METHODS = new Set(["email", "whatsapp"]);
const VALID_PRIORITY_LEVELS = new Set(["low", "medium", "high"]);

// courses column limits (varchar sizes from the live schema).
const COURSE_LIMITS = {
    course_code: 20,
    course_name: 150,
    professor_name: 100,
    office_hours: 255,
    meeting_times: 255,
    room: 80,
    textbook_link: 500,
};
const ACTIVITY_NAME_LIMIT = 150;

// --------------------------------------------------------------------------- //
// Small coercion helpers                                                       //
// --------------------------------------------------------------------------- //
function clampStr(value, max) {
    if (value == null) return null;
    const s = String(value).trim();
    if (s === "") return null;
    return s.length > max ? s.slice(0, max) : s;
}

function toNumberOrNull(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

// Accepts 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS' (or ISO 'YYYY-MM-DDTHH:MM...'),
// returns a MySQL DATETIME 'YYYY-MM-DD HH:MM:SS', or null if unparseable.
function toDateTime(value, defaultTime = "23:59:00") {
    if (value == null) return null;
    const s = String(value).trim();
    if (s === "") return null;

    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (dateOnly) return `${s} ${defaultTime}`;

    const full = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
    if (full) {
        const [, y, mo, d, hh, mm, ss] = full;
        return `${y}-${mo}-${d} ${hh}:${mm}:${ss || "00"}`;
    }
    return null;
}

// --------------------------------------------------------------------------- //
// normalizeExtraction — for the review UI (category stays a NAME)             //
// --------------------------------------------------------------------------- //
export function normalizeExtraction(raw, { term } = {}) {
    const c = raw?.course || {};
    const course = {
        course_code: clampStr(c.course_code, COURSE_LIMITS.course_code),
        course_name: clampStr(c.course_name, COURSE_LIMITS.course_name),
        professor_name: clampStr(c.professor_name, COURSE_LIMITS.professor_name),
        office_hours: clampStr(c.office_hours, COURSE_LIMITS.office_hours),
        meeting_times: clampStr(c.meeting_times, COURSE_LIMITS.meeting_times),
        room: clampStr(c.room, COURSE_LIMITS.room),
        textbook_link: clampStr(c.textbook_link, COURSE_LIMITS.textbook_link),
        gpa_goal: toNumberOrNull(c.gpa_goal),
        term: clampStr(term, 30),
    };

    const activities = (raw?.activities || []).map((a) => ({
        activity_category: CATEGORY_NAME_TO_ID[a?.activity_category] ? a.activity_category : "Assignment",
        activity_name: clampStr(a?.activity_name, ACTIVITY_NAME_LIMIT),
        due_date: toDateTime(a?.due_date),
        grading_weight: (() => {
            const w = toNumberOrNull(a?.grading_weight);
            return w == null ? null : Math.round(w * 100) / 100;
        })(),
    }));

    return { course, activities };
}

// --------------------------------------------------------------------------- //
// validateCoursePayload — strict guard for POST /user/courses                 //
// --------------------------------------------------------------------------- //
export function validateCoursePayload(payload) {
    const errors = [];
    const c = payload?.course || {};

    const course_code = clampStr(c.course_code, COURSE_LIMITS.course_code);
    const course_name = clampStr(c.course_name, COURSE_LIMITS.course_name);
    const term = clampStr(c.term, 30);

    if (!course_code) errors.push("course.course_code is required");
    if (!course_name) errors.push("course.course_name is required");
    if (!term) errors.push("course.term is required");

    const course = {
        course_code,
        course_name,
        term,
        professor_name: clampStr(c.professor_name, COURSE_LIMITS.professor_name),
        office_hours: clampStr(c.office_hours, COURSE_LIMITS.office_hours),
        meeting_times: clampStr(c.meeting_times, COURSE_LIMITS.meeting_times),
        room: clampStr(c.room, COURSE_LIMITS.room),
        textbook_link: clampStr(c.textbook_link, COURSE_LIMITS.textbook_link),
        gpa_goal: toNumberOrNull(c.gpa_goal),
    };

    const rawActivities = Array.isArray(payload?.activities) ? payload.activities : [];
    const activities = rawActivities.map((a, i) => {
        const label = a?.activity_name ? `"${a.activity_name}"` : `#${i + 1}`;
        const result = validateActivityPayload(a, `activity ${label}: `);
        errors.push(...result.errors);
        return result.normalized;
    });

    return { ok: errors.length === 0, errors, normalized: { course, activities } };
}

// --------------------------------------------------------------------------- //
// validateActivityPayload — one activity, for POST /user/activities           //
// --------------------------------------------------------------------------- //
/**
 * Validates + normalizes a single activity into the exact shape
 * activityModel.createActivity expects. Shared with validateCoursePayload so
 * the manual "add assignment" path and the syllabus path can't drift apart.
 *
 * @param {object} a       raw activity from the client
 * @param {string} prefix  prepended to each error, so the course path can say
 *                         which activity in the list failed
 */
export function validateActivityPayload(a, prefix = "") {
    const errors = [];

    const activity_name = clampStr(a?.activity_name, ACTIVITY_NAME_LIMIT);
    if (!activity_name) errors.push(`${prefix}activity_name is required`);

    const activity_category_id = Number(a?.activity_category_id);
    if (!VALID_CATEGORY_IDS.has(activity_category_id)) {
        errors.push(`${prefix}activity_category_id must be one of 1,2,3,4`);
    }

    const due_date = toDateTime(a?.due_date);
    if (!due_date) errors.push(`${prefix}a valid due_date is required`);

    let grading_weight = toNumberOrNull(a?.grading_weight);
    if (grading_weight == null || grading_weight < 0) grading_weight = 0;
    if (grading_weight > 100) errors.push(`${prefix}grading_weight must be between 0 and 100`);
    grading_weight = Math.round(grading_weight * 100) / 100;

    // The DB has CHECK (reminder_date <= due_date) — catch it here so a bad
    // pairing comes back as a readable 400 instead of a constraint 500.
    const reminder_date = toDateTime(a?.reminder_date, "09:00:00");
    if (reminder_date && due_date && reminder_date > due_date) {
        errors.push(`${prefix}reminder_date must be on or before due_date`);
    }

    const reminder_method =
        a?.reminder_method && VALID_REMINDER_METHODS.has(a.reminder_method)
            ? a.reminder_method
            : "email";
    const priority_level =
        a?.priority_level && VALID_PRIORITY_LEVELS.has(a.priority_level)
            ? a.priority_level
            : "medium";

    return {
        ok: errors.length === 0,
        errors,
        normalized: {
            activity_category_id,
            activity_name,
            due_date,
            grading_weight,
            reminder_date,
            reminder_method,
            priority_level,
        },
    };
}
