// Translate raw backend rows into values our UI expects.

export const COURSE_PALETTE = [
  "sky", "violet", "amber", "coral", "teal", "lime", "rose", "slate",
];

export const colorForIndex = (i) => COURSE_PALETTE[i % COURSE_PALETTE.length];

// Mirror of CATEGORY_NAME_TO_ID in backend/src/services/syllabusNormalizer.js.
export const CATEGORY_ID_TO_NAME = { 1: "Assignment", 2: "Quiz", 3: "Exam", 4: "Project" };

const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// --------------------------------------------------------------------------- //
// Activities                                                                   //
// --------------------------------------------------------------------------- //
/**
 * Raw activity row -> the shape assignmentRow.js / dashboard.js consume.
 * "graded", everything else is "not_started" (overdue styling comes from dueDate).
 */
export function adaptActivity(row) {
  const grade = num(row.grade);
  return {
    id: row.activity_id,
    courseId: row.course_id,
    name: row.activity_name,
    category: CATEGORY_ID_TO_NAME[row.activity_category_id] || "Assignment",
    weight: num(row.grading_weight) ?? 0,
    dueDate: row.due_date,
    grade,
    // activities.status is the stored value; fall back to deriving it from the grade for rows written before that column existed.
    status: row.status || (grade != null ? "graded" : "not_started"),
  };
}

// --------------------------------------------------------------------------- //
// Courses                                                                      //
// --------------------------------------------------------------------------- //
// Weighted average of graded activities' grades, weighted by grading_weight.
// Returns null when the course has no graded activities yet.
function weightedGrade(activities) {
  const graded = activities.filter((a) => a.grade != null);
  if (!graded.length) return null;
  let sumW = 0, sumGW = 0;
  for (const a of graded) {
    const w = a.weight > 0 ? a.weight : 1; // fall back to equal weight if unset
    sumW += w;
    sumGW += a.grade * w;
  }
  return sumW ? sumGW / sumW : null;
}

// Share of a course's total graded weight that has a grade recorded.
function percentComplete(activities) {
  const total = activities.reduce((s, a) => s + (a.weight > 0 ? a.weight : 0), 0);
  if (!total) return 0;
  const done = activities
    .filter((a) => a.grade != null)
    .reduce((s, a) => s + (a.weight > 0 ? a.weight : 0), 0);
  return Math.round((done / total) * 100);
}

/**
 * Raw course row -> the shape courseCard.js consumes, plus `term` (used for GPA
 * scoping) and a computed `currentGrade` (percent or null) and `percentComplete`.
 * @param {object} row
 * @param {number} index
 * @param {Array}  courseActivities
 */
export function adaptCourse(row, index, courseActivities = []) {
  const grade = weightedGrade(courseActivities);
  return {
    id: row.course_id,
    code: row.course_code,
    name: row.course_name,
    professor: row.professor_name || "",
    color: colorForIndex(index),
    term: row.term || null,
    currentGrade: grade == null ? null : Math.round(grade),
    percentComplete: percentComplete(courseActivities),
  };
}

// --------------------------------------------------------------------------- //
// GPA                                                                          //
// --------------------------------------------------------------------------- //
// MVP conversion: map a course's average percentage linearly onto the user's GPA
// scale (e.g. 87% -> 3.48 on a 4.0 scale). Not letter-grade banded — good enough
// until a real grade-point table exists; the raw grades in the DB are the source
// of truth and this can be swapped without touching the UI.
const pctToPoints = (pct, scale) => (pct / 100) * scale;

/**
 * Compute term and cumulative GPA from adapted courses.
 * Each course with >=1 graded activity contributes its average (equal weight —
 * the schema has no credits). termGpa filters to the current term; cumulative
 * uses every course. Either is null when no graded course exists.
 *
 * @param {Array}  courses      adapted courses (must have currentGrade + term)
 * @param {object} opts
 * @param {string} opts.currentTerm term string to scope termGpa to
 * @param {number} opts.scale       user's GPA scale (default 4.0)
 * @returns {{ termGpa: number|null, cumulativeGpa: number|null, scale: number }}
 */
export function computeGpa(courses, { currentTerm, scale = 4.0 } = {}) {
  const graded = courses.filter((c) => c.currentGrade != null);
  const mean = (list) => {
    if (!list.length) return null;
    const avgPct = list.reduce((s, c) => s + c.currentGrade, 0) / list.length;
    return Math.round(pctToPoints(avgPct, scale) * 100) / 100;
  };
  const termCourses = currentTerm ? graded.filter((c) => c.term === currentTerm) : graded;
  return {
    termGpa: mean(termCourses),
    cumulativeGpa: mean(graded),
    scale,
  };
}
