/* Trackr — mock data (student "Alex Chen"). Replaced by the backend later.
   Activity due dates are generated relative to "now" so the dashboard's
   "due this week" / "overdue" counts always stay coherent. */

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

/** @type {import('./types.js').Semester} */
export const semester = { term: 'Spring 2026', weekCurrent: 11, weekTotal: 16 };

/** @type {import('./types.js').User} */
export const user = {
  id: 'u_alex', firstName: 'Alex', lastName: 'Chen', year: 3, email: 'alexchen@mylaurier.ca',
  currentGPA: 3.72, cumulativeGPA: 3.61, gpaDelta: 0.03, gpaScale: 4.0,
  studyStreak: 12, creditsThisTerm: 2.5,
};

/** @type {import('./types.js').Course[]} */
export const courses = [
  { id: 'c_cs301',  code: 'CS301',   name: 'Introduction to Algorithms', professor: 'Dr. Sarah Kim',  color: 'sky',    currentGrade: 87, percentComplete: 68, credits: 0.5 },
  { id: 'c_math201',code: 'MATH201', name: 'Linear Algebra',             professor: 'Dr. James Park', color: 'violet', currentGrade: 82, percentComplete: 60, credits: 0.5 },
  { id: 'c_econ201',code: 'ECON201', name: 'Microeconomics',            professor: 'Dr. Lena Ortiz', color: 'amber',  currentGrade: 91, percentComplete: 72, credits: 0.5 },
  { id: 'c_psy101', code: 'PSY101',  name: 'Introduction to Psychology', professor: 'Dr. R. Singh',   color: 'coral',  currentGrade: 88, percentComplete: 55, credits: 0.5 },
  { id: 'c_eng250', code: 'ENG250',  name: 'Technical Writing',          professor: 'Dr. M. Boyd',    color: 'teal',   currentGrade: 94, percentComplete: 80, credits: 0.5 },
];

/** @type {import('./types.js').Activity[]} */
export const activities = [
  { id: 'a1',  courseId: 'c_cs301',   name: 'Assignment 1 — Sorting Algorithms', category: 'Assignment', weight: 6,  dueDate: iso(-2),  status: 'not_started', grade: null, missingInfo: true },
  { id: 'a2',  courseId: 'c_psy101',  name: 'Reading Response 6',                category: 'Quiz',       weight: 5,  dueDate: iso(0),   status: 'in_progress', grade: null },
  { id: 'a3',  courseId: 'c_cs301',   name: 'Assignment 2 — Graph Traversal',    category: 'Assignment', weight: 7,  dueDate: iso(2),   status: 'in_progress', grade: null },
  { id: 'a4',  courseId: 'c_math201', name: 'Problem Set 4',                     category: 'Assignment', weight: 8,  dueDate: iso(3),   status: 'not_started', grade: null },
  { id: 'a5',  courseId: 'c_eng250',  name: 'Essay Draft',                       category: 'Assignment', weight: 10, dueDate: iso(4),   status: 'not_started', grade: null },
  { id: 'a6',  courseId: 'c_econ201', name: 'Quiz 3 — Elasticity',               category: 'Quiz',       weight: 5,  dueDate: iso(5),   status: 'not_started', grade: null },
  { id: 'a7',  courseId: 'c_cs301',   name: 'Lab 6 — Hash Tables',               category: 'Lab',        weight: 4,  dueDate: iso(6),   status: 'not_started', grade: null },
  { id: 'a8',  courseId: 'c_math201', name: 'Midterm Exam',                      category: 'Midterm',    weight: 20, dueDate: iso(10),  status: 'not_started', grade: null },
  { id: 'a9',  courseId: 'c_psy101',  name: 'Paper 2 — Cognition',               category: 'Assignment', weight: 15, dueDate: iso(14),  status: 'not_started', grade: null },
  { id: 'a10', courseId: 'c_cs301',   name: 'Midterm Exam',                      category: 'Midterm',    weight: 20, dueDate: iso(-14), status: 'graded',      grade: 88 },
  { id: 'a11', courseId: 'c_econ201', name: 'Assignment 1 — Supply & Demand',    category: 'Assignment', weight: 8,  dueDate: iso(-10), status: 'graded',      grade: 91 },
  { id: 'a12', courseId: 'c_eng250',  name: 'Memo 1',                            category: 'Assignment', weight: 6,  dueDate: iso(-7),  status: 'graded',      grade: 95 },
  { id: 'a13', courseId: 'c_math201', name: 'Quiz 1 — Vectors',                  category: 'Quiz',       weight: 5,  dueDate: iso(-12), status: 'graded',      grade: 84 },
  { id: 'a14', courseId: 'c_cs301',   name: 'Quiz 3 — Recurrences',              category: 'Quiz',       weight: 5,  dueDate: iso(-5),  status: 'submitted',   grade: null },
];

/** Study hours Mon–Sun (this week). */
export const studyHours = [
  { day: 'Mon', hours: 4.5 }, { day: 'Tue', hours: 3.8 }, { day: 'Wed', hours: 6.5 },
  { day: 'Thu', hours: 4.3 }, { day: 'Fri', hours: 9.7 }, { day: 'Sat', hours: 3.5 }, { day: 'Sun', hours: 4.5 },
];