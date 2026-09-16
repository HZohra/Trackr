/* Trackr — Courses page. One file, two modes:
     courses.html        -> grid of every course (the sidebar link lands here)
     courses.html?id=N   -> detail view for that course */

import { deleteCourse, getCourses, getCourse } from "./api.js";
import { requireAuth } from "./auth.js";
import { courseCard, courseCardSkeleton } from "./components/courseCard.js";
import { getParam, paramLink } from "./url.js";

const $ = (s) => document.querySelector(s);
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Course names, professors and office hours come from the DB (ultimately from a parsed syllabus). */
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Mirrors STATUS_OPTIONS / STATUS_CLASS in assignment-view.js — the four values
// activities.status accepts, and the pill classes in app-pages.css.
const STATUS_LABEL = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  graded: "Graded",
};
const STATUS_CLASS = {
  not_started: "not-started",
  in_progress: "in-progress",
  submitted: "graded",
  graded: "graded",
};

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Unfinished and past due. Overdue is derived, not stored — same rule the dashboard uses to count "needs attention".
function isOverdue(a) {
  if (a.status === "graded" || a.status === "submitted") return false;
  if (!a.dueDate) return false;
  const d = new Date(a.dueDate);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday();
}

function message(html) {
  $("#courseMsg").innerHTML = `<div class="dash-empty">${html}</div>`;
}

// Widths render at 0 and animate to their real value once mounted, so the bars sweep in instead of snapping.
function animate() {
  requestAnimationFrame(() => {
    document.querySelectorAll("[data-w]").forEach((el) => {
      el.style.width = el.dataset.w + "%";
    });
  });
}

/* --------------------------------------------------------------------------- */
/* Grid mode                                                                    */
/* --------------------------------------------------------------------------- */
async function renderGrid() {
  const grid = $("#courseGrid");
  grid.hidden = false;
  $("#courseCards").innerHTML = Array.from({ length: 6 }, courseCardSkeleton).join("");

  const courses = await getCourses();

  if (!courses.length) {
    $("#courseCards").innerHTML = "";
    $("#courseGridSub").textContent = "";
    message(
      `<b>No courses yet.</b><span><a href="upload-syllabus.html">Upload a syllabus</a> to add your first one.</span>`,
    );
    return;
  }

  $("#courseGridSub").textContent =
    courses.length === 1 ? "1 course" : `${courses.length} courses`;
  $("#courseCards").innerHTML = courses.map(courseCard).join("");
  animate();
}

/* --------------------------------------------------------------------------- */
/* Detail mode                                                                  */
/* --------------------------------------------------------------------------- */

// The card shape (adapters.js) drops these, so they're read off the raw row.
function headerHtml(course, raw) {
  const lines = [
    ["Professor", raw.professor_name],
    ["Term", raw.term],
    ["Meets", raw.meeting_times],
    ["Room", raw.room],
    ["Office Hours", raw.office_hours],
    ["Textbook", raw.textbook_link],
  ]
    // Skip anything the syllabus didn't provide rather than printing "null".
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([label, v]) => `<p class="course-meta">${esc(label)}: ${esc(v)}</p>`)
    .join("");

  return `
    <p class="page-eyebrow">${esc(course.code || "Course")}</p>
    <h1>${esc(course.name || "Untitled course")}</h1>
    ${lines}`;
}

// Weights come from activities.grading_weight, summed per category — this is
// what the old hardcoded "Assignments 30% / Labs 15% / …" list was faking.
function breakdownHtml(activities) {
  const totals = new Map();
  for (const a of activities) {
    if (!(a.weight > 0)) continue;
    totals.set(a.category, (totals.get(a.category) || 0) + a.weight);
  }
  if (!totals.size) {
    return `<div class="dash-empty"><b>No weights recorded.</b><span>This course's syllabus didn't include a grade breakdown.</span></div>`;
  }

  const rows = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, w]) => `<div class="breakdown-row"><span>${esc(cat)}</span><b>${Math.round(w)}%</b></div>`)
    .join("");

  // Flag a breakdown that doesn't add up — a common syllabus-parsing miss.
  const total = Math.round([...totals.values()].reduce((s, w) => s + w, 0));
  const note =
    total === 100
      ? ""
      : `<div class="warning">These weights add up to ${total}%, not 100% — the syllabus may be missing an item.</div>`;

  return rows + note;
}

function assignmentsHtml(activities, courseId) {
  if (!activities.length) {
    return `<div class="dash-empty"><b>No assignments yet.</b><span>Nothing has been added for this course.</span></div>`;
  }

  const rows = activities
    .map((a) => {
      const overdue = isOverdue(a);
      const cls = overdue ? "overdue" : STATUS_CLASS[a.status] || "not-started";
      const label = overdue ? "Overdue" : STATUS_LABEL[a.status] || "Not Started";
      const grade = a.grade == null ? "-" : a.grade;
      return `
        <tr>
          <td><a href="${paramLink("assignments-view.html", "course", courseId)}">${esc(a.name)}</a></td>
          <td>${esc(a.category)}</td>
          <td>${fmtDate(a.dueDate)}</td>
          <td>${a.weight > 0 ? Math.round(a.weight) + "%" : "—"}</td>
          <td><span class="status ${cls}">${label}</span></td>
          <td>${grade} / 100</td>
        </tr>`;
    })
    .join("");

  return `
    <table class="assignment-table">
      <tr>
        <th>Assignment</th><th>Type</th><th>Due Date</th>
        <th>Weight</th><th>Status</th><th>Grade</th>
      </tr>
      ${rows}
    </table>`;
}

async function renderDetail(id) {
  const detail = $("#courseDetail");
  detail.hidden = false;
  $("#courseHeader").innerHTML = `<div class="sk sk--chip"></div>
    <div class="sk sk--line" style="width:220px;margin:.6rem 0 .5rem"></div>
    <div class="sk sk--line sk--sm" style="width:160px"></div>`;

  let course, raw, activities;
  try {
    ({ course, raw, activities } = await getCourse(id));
  } catch (e) {
    detail.hidden = true;
    // getCourse throws on any non-2xx; 404 is the ownership check in
    // courseModel.getCourseById refusing an unknown or someone else's course.
    message(
      /\(404\)/.test(e.message)
        ? `<b>Course not found.</b><span>It may have been deleted, or it isn't yours. <a href="#">Back to your courses</a>.</span>`
        : `<b>Couldn't load this course.</b><span><a href="#">Back to your courses</a>.</span>`,
    );
    return;
  }

  $("#courseEyebrow").innerHTML = `<a href="#">← All courses</a>`;
  document.title = `${course.code || "Course"} · Trackr`;

  $("#courseHeader").innerHTML = headerHtml(course, raw);
  const deleteButton = $("#deleteCourseBtn");
  deleteButton.hidden = false;
  deleteButton.disabled = false;
  deleteButton.textContent = "Delete Course";

  deleteButton.onclick = async () => {
    const confirmed = confirm(
      `Are you sure you want to delete ${course.code || "this course"}? ` +
      "All assignments in this course will also be deleted. This cannot be undone.",
    );

    if (!confirmed) return;

    deleteButton.disabled = true;
    deleteButton.textContent = "Deleting...";

    try {
      await deleteCourse(course.id);
      alert("Course deleted successfully.");
      window.location.replace("courses.html");
    } catch (error) {
      console.error("Delete course failed:", error);
      alert(error.message || "Could not delete the course. Please try again.");
      deleteButton.disabled = false;
      deleteButton.textContent = "Delete Course";
    }
  };
  $("#courseGrade").textContent =
    course.currentGrade == null ? "—" : course.currentGrade + "%";
  $("#courseBar").dataset.w = course.percentComplete;

  $("#courseBreakdown").innerHTML = breakdownHtml(activities);
  $("#courseAssignments").innerHTML = assignmentsHtml(activities, course.id);

  if (reduce) $("#courseBar").style.width = course.percentComplete + "%";
  else animate();
}

/* --------------------------------------------------------------------------- */

// Both modes share one page, so clear the other one's output before rendering —
// otherwise a stale detail view lingers behind the grid on hash navigation.
function reset() {
  $("#courseGrid").hidden = true;
  $("#courseDetail").hidden = true;
  $("#courseMsg").innerHTML = "";
  $("#courseEyebrow").textContent = "Courses";
  document.title = "Courses · Trackr";
}

async function init() {
  if (!requireAuth()) return;
  reset();

  const id = getParam("id");
  try {
    if (id) await renderDetail(id);
    else await renderGrid();
  } catch (e) {
    $("#courseGrid").hidden = true;
    $("#courseDetail").hidden = true;
    message(
      `<b>Couldn't load your courses.</b><span>Your session may have expired. <a href="login.html">Log in again</a>.</span>`,
    );
  }
}

// Course links are hash links (see url.js), so moving between the grid and a
// course doesn't reload the page — re-render on the fragment change instead.
window.addEventListener("hashchange", init);

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init);
else init();
