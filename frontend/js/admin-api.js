/* ============================================================
   Trackr — Admin API seam.
   Mirrors js/api.js, but for the admin-only /admin/* endpoints: the page calls THESE, never the backend directly.
   ============================================================ */

import { API_BASE, authHeaders } from "./auth.js";

async function apiGet(path) {
  const res = await fetch(API_BASE + path, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}

// mysql2 hands DECIMAL/BIGINT columns back as strings ("88.00"), so counts
// coming out of COUNT(*) subqueries need coercing before they hit the UI.
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fullName = (first, last) => `${first || ""} ${last || ""}`.trim();

/* ---------- date formatting ---------- */

// "Jan 6, 2026" — matches the format used on the assignments page.
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// "2 min ago" for today's events, "Yesterday, 4:12 pm" for yesterday's, and a plain date beyond that
export function relativeTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

  return formatDate(value);
}

/* ---------- shared fetch ---------- */
// Courses and students are each fetched once per page load and shared across the getters, since the dashboard calls all four together via Promise.all.
let _dataPromise = null;

export function invalidateAdminData() {
  _dataPromise = null;
}

function loadData() {
  if (_dataPromise) return _dataPromise;
  _dataPromise = (async () => {
    const [rawCourses, rawStudents] = await Promise.all([
      apiGet("/admin/courses"),
      apiGet("/admin/users?role=student"),
    ]);
    return {
      courses: rawCourses.map(adaptCourse),
      students: rawStudents.map(adaptStudent),
    };
  })();
  return _dataPromise;
}

/* ---------- adapters ---------- */

function adaptCourse(row) {
  return {
    id: row.course_id,
    code: row.course_code,
    name: row.course_name,
    professor: row.professor_name || "—",
    semester: row.term || "—",
    owner: fullName(row.owner_first_name, row.owner_last_name) || "—",
    activityCount: num(row.activity_count),
  };
}

function adaptStudent(row) {
  return {
    id: row.user_id,
    name: fullName(row.first_name, row.last_name),
    email: row.email || "",
    joined: formatDate(row.created_at),
    courses: num(row.course_count),
    assignments: num(row.activity_count),
  };
}

/* ---------- getters (the seam the page imports) ---------- */

export async function getAdminMetrics() {
  const stats = await apiGet("/admin/statistics");
  return {
    totalStudents: num(stats.total_students),
    totalCourses: num(stats.total_courses),
    totalActivities: num(stats.total_activities),
    gradedActivities: num(stats.graded_activities),
  };
}
export async function getRecentActivity() {
  const rows = await apiGet("/admin/recent-activity");
  return rows.map((row) => ({
    type: row.type,
    subject: row.subject || "",
    context: row.context || "",
    time: relativeTime(row.at),
  }));
}

export async function getAdminCourses() {
  const { courses } = await loadData();
  return courses;
}

export async function getStudents() {
  const { students } = await loadData();
  return students;
}
