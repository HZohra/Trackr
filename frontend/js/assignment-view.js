import {
  createActivity,
  deleteActivity,
  getActivities,
  getCourses,
  updateActivity,
} from "./api.js";
import { CATEGORY_ID_TO_NAME } from "./adapters.js";
import { getParam } from "./url.js";

const listEl = document.getElementById("assignmentList");
const tabsEl = document.getElementById("sortTabs");

let activities = [];
let coursesById = {};
let sortMode = "due";
const filters = { q: "", courseId: "", status: "" };

// These four are the only values activities.status accepts.
const STATUS_OPTIONS = [
  ["not_started", "Not Started"],
  ["in_progress", "In Progress"],
  ["submitted", "Submitted"],
  ["graded", "Graded"],
];

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS);
// reuse the existing pill classes from app-pages.css
const STATUS_CLASS = {
  not_started: "not-started", in_progress: "in-progress",
  graded: "graded", submitted: "graded",
};

const DAY = 86400000;
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// priority = unfinished + heavy + due soon/overdue float to the top.
function priorityScore(a) {
  const daysLeft = (new Date(a.dueDate) - Date.now()) / DAY;
  const done = a.status === "graded" || a.status === "submitted";
  let score = a.weight;                  // heavier counts more
  if (!done) score += 20;                // unfinished outranks finished
  score += Math.max(0, 30 - daysLeft);   // sooner / overdue counts more
  return score;
}

// Narrow to what the filter bar asks for. Empty string = "no filter", which is what the "All …" options carry as their value.
function filtered() {
  const q = filters.q.trim().toLowerCase();
  return activities.filter((a) => {
    if (filters.courseId && String(a.courseId) !== filters.courseId) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (q) {
      const code = coursesById[a.courseId]?.code ?? "";
      if (!`${a.name} ${code}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function sorted() {
  const arr = filtered();
  if (sortMode === "due")      arr.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  if (sortMode === "weight")   arr.sort((a, b) => b.weight - a.weight);
  if (sortMode === "priority") arr.sort((a, b) => priorityScore(b) - priorityScore(a));
  return arr;
}

// The course list comes from the user's actual courses; the status list from STATUS_OPTIONS, so it can't drift from what the backend accepts.
function populateFilters() {
  const courseSel = document.getElementById("filterCourse");
  const statusSel = document.getElementById("filterStatus");
  if (courseSel) {
    courseSel.innerHTML =
      `<option value="">All Courses</option>` +
      Object.values(coursesById)
        .map((c) => `<option value="${c.id}">${c.code} — ${c.name}</option>`)
        .join("");

    const wanted = getParam("course");
    if (wanted && coursesById[wanted]) {
      filters.courseId = wanted;
      courseSel.value = wanted;
    }
  }
  if (statusSel) {
    statusSel.innerHTML =
      `<option value="">All Status</option>` +
      STATUS_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  }
}

function statusSelect(a) {
  const opts = STATUS_OPTIONS
    .map(([v, l]) => `<option value="${v}"${v === a.status ? " selected" : ""}>${l}</option>`)
    .join("");
  return `<select class="js-status" data-id="${a.id}">${opts}</select>`;
}

function cardHTML(a) {
  const code = coursesById[a.courseId]?.code ?? "";
  const cls = STATUS_CLASS[a.status] ?? "not-started";
  const label = STATUS_LABEL[a.status] ?? a.status;
  const isGraded = a.grade != null;
  const missing = a.missingInfo
    ? `<p class="missing">Missing assignment info — please review and update this entry.</p>`
    : "";
  const bigGrade = isGraded ? `<h2 class="js-bigGrade" data-id="${a.id}">${a.grade}%</h2>` : "";
  return `
    <div class="assignment-card" data-id="${a.id}">
      <span class="tag">${a.category}</span><span class="tag">${code}</span>
      <span class="assignment-status ${cls}">${label}</span>
      <h3>${a.name}</h3>
      <p>Due ${fmtDate(a.dueDate)} · ${a.weight}% of final grade</p>
      ${missing}
      ${bigGrade}
      <b>Status</b><br />
      ${statusSelect(a)}
      <b>Grade</b><br />
      <input type="number" class="js-grade" data-id="${a.id}" value="${a.grade ?? ""}" placeholder="–" /> / 100
      <br /><br />
      <button class="js-update" data-id="${a.id}">Update grade</button>
      <button class="js-delete btn-danger" data-id="${a.id}">Delete</button>
      <span class="js-msg" data-id="${a.id}" role="status"></span>
    </div>`;
}

function render() {
  const shown = sorted();
  listEl.innerHTML = shown.length
    ? shown.map(cardHTML).join("")
    : `<p class="subtext">No assignments match these filters.</p>`;

  // Counts describe what's on screen, so they stay honest while filtering.
  const overdue = shown.filter(
    (a) => new Date(a.dueDate) < Date.now() &&
           a.status !== "graded" && a.status !== "submitted"
  ).length;
  const isFiltered = shown.length !== activities.length;
  const subtext = document.querySelector(".subtext");
  if (subtext) {
    subtext.textContent = isFiltered
      ? `${shown.length} of ${activities.length} · ${overdue} overdue`
      : `${activities.length} total · ${overdue} overdue`;
  }
}

const findById = (id) => activities.find((x) => String(x.id) === String(id));

function showMessage(id, text, isError) {
  const el = listEl.querySelector(`.js-msg[data-id="${id}"]`);
  if (!el) return;
  el.textContent = text;
  el.className = `js-msg ${isError ? "is-error" : "is-ok"}`;
}

// Swap in the row the server stored and repaint.
function applyUpdate(saved) {
  const i = activities.findIndex((x) => String(x.id) === String(saved.id));
  if (i !== -1) activities[i] = saved;
  render();
}

document.getElementById("filterSearch")?.addEventListener("input", (e) => {
  filters.q = e.target.value;
  render();
});
document.getElementById("filterCourse")?.addEventListener("change", (e) => {
  filters.courseId = e.target.value;
  render();
});
document.getElementById("filterStatus")?.addEventListener("change", (e) => {
  filters.status = e.target.value;
  render();
});

tabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-sort]");
  if (!btn) return;
  sortMode = btn.dataset.sort;
  tabsEl.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
  render();
});

listEl.addEventListener("change", async (e) => {
  const sel = e.target.closest(".js-status");
  if (!sel) return;
  const a = findById(sel.dataset.id);
  if (!a) return;

  const id = a.id;
  sel.disabled = true;
  try {
    applyUpdate(await updateActivity(id, { grade: a.grade, status: sel.value }));
    showMessage(id, "Status saved.", false);
  } catch (err) {
    render(); 
    showMessage(id, err.message, true);
  }
});

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".js-update");
  if (!btn) return;
  const a = findById(btn.dataset.id);
  const input = listEl.querySelector(`.js-grade[data-id="${btn.dataset.id}"]`);
  if (!a || !input) return;

  const id = a.id;
  const raw = input.value.trim();
  if (raw === "") {
    showMessage(id, "Enter a grade first.", true);
    return;
  }
  const grade = Number(raw);
  if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
    showMessage(id, "Grade must be between 0 and 100.", true);
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    // Recording a grade implies the work is graded, unless it's already
    // further along in a way the dropdown captured.
    applyUpdate(await updateActivity(id, { grade, status: "graded" }));
    showMessage(id, "Grade saved.", false);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Update grade";
    showMessage(id, err.message, true);
  }
});

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".js-delete");
  if (!btn) return;
  const a = findById(btn.dataset.id);
  if (!a) return;

  // Hard delete with no undo, so make sure it was intended. Native confirm
  // matches how settings.js gates account deletion.
  if (!confirm(`Delete "${a.name}"? This can't be undone.`)) return;

  const id = a.id;
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    await deleteActivity(id);
    // Drop it locally and repaint — the card vanishing is the confirmation,
    // and render() recomputes the total/overdue counts.
    activities = activities.filter((x) => String(x.id) !== String(id));
    render();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Delete";
    showMessage(id, err.message, true);
  }
});

// --------------------------------------------------------------------------- //
// Add assignment modal                                                         //
// --------------------------------------------------------------------------- //
const modalEl = document.getElementById("addModal");
const formEl = document.getElementById("addAssignmentForm");
const formErrorEl = document.getElementById("formError");
const saveBtn = document.getElementById("saveAssignment");

const field = (id) => document.getElementById(id);

// Same options the filter bar uses, minus the "All …" entry — a new assignment
// has to belong to exactly one existing course.
function populateFormOptions() {
  const courseSel = field("a-course");
  const categorySel = field("a-category");
  if (courseSel) {
    courseSel.innerHTML =
      `<option value="">Select a course…</option>` +
      Object.values(coursesById)
        .map((c) => `<option value="${c.id}">${c.code} — ${c.name}</option>`)
        .join("");
    // Adding from a filtered view most likely means adding to that course.
    if (filters.courseId) courseSel.value = filters.courseId;
  }
  if (categorySel) {
    categorySel.innerHTML = Object.entries(CATEGORY_ID_TO_NAME)
      .map(([id, name]) => `<option value="${id}">${name}</option>`)
      .join("");
  }
}

function openModal() {
  if (!modalEl) return;
  formEl.reset();
  formEl.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  formErrorEl.textContent = "";
  populateFormOptions();
  modalEl.hidden = false;
  field("a-course")?.focus();
}

function closeModal() {
  if (modalEl) modalEl.hidden = true;
  document.getElementById("addAssignmentBtn")?.focus();
}

document.getElementById("addAssignmentBtn")?.addEventListener("click", openModal);
document.getElementById("cancelAdd")?.addEventListener("click", closeModal);

// Clicking the dimmed area outside the panel dismisses it; clicks inside don't.
modalEl?.addEventListener("click", (e) => {
  if (e.target === modalEl) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalEl && !modalEl.hidden) closeModal();
});

// Mirrors the server's rules (validateActivityPayload) so the common mistakes
// are caught without a round-trip. The server still re-checks everything.
function readForm() {
  const errors = [];
  let firstBad = null;
  const bad = (el, msg) => {
    errors.push(msg);
    el.classList.add("is-invalid");
    if (!firstBad) firstBad = el;
  };

  formEl.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));

  const courseEl = field("a-course");
  const nameEl = field("a-name");
  const dueEl = field("a-due");
  const weightEl = field("a-weight");
  const reminderEl = field("a-reminder");

  if (!courseEl.value) bad(courseEl, "Pick a course.");
  if (!nameEl.value.trim()) bad(nameEl, "Enter an assignment name.");
  if (!dueEl.value) bad(dueEl, "Pick a due date.");

  const rawWeight = weightEl.value.trim();
  let weight = 0;
  if (rawWeight !== "") {
    weight = Number(rawWeight);
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
      bad(weightEl, "Weight must be between 0 and 100.");
    }
  }

  // The DB enforces reminder_date <= due_date, so a bad pairing would otherwise
  // come back as a save failure after the fact.
  if (reminderEl.value && dueEl.value && reminderEl.value > dueEl.value) {
    bad(reminderEl, "The reminder has to be on or before the due date.");
  }

  if (errors.length) {
    firstBad?.focus();
    return { errors };
  }

  return {
    fields: {
      course_id: Number(courseEl.value),
      activity_name: nameEl.value.trim(),
      activity_category_id: Number(field("a-category").value),
      due_date: dueEl.value,
      grading_weight: weight,
      reminder_date: reminderEl.value || null,
      reminder_method: field("a-method").value,
      priority_level: field("a-priority").value,
    },
  };
}

formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  formErrorEl.textContent = "";

  const { errors, fields } = readForm();
  if (errors) {
    formErrorEl.textContent = errors.join(" · ");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    // The response is the row the server stored, so the card we render matches
    // the database without a refetch.
    activities.push(await createActivity(fields));
    closeModal();
    render();
  } catch (err) {
    formErrorEl.textContent =
      err.message === "Failed to fetch"
        ? "Could not reach the server. Is the backend running on port 5000?"
        : err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Add assignment";
  }
});

(async function init() {
  try {
    const [acts, courses] = await Promise.all([getActivities(), getCourses()]);
    activities = acts;
    coursesById = Object.fromEntries(courses.map((c) => [c.id, c]));
    populateFilters();
    populateFormOptions();
    render();
  } catch (e) {
    listEl.innerHTML =
      `<p class="subtext">Couldn't load your assignments — your session may have expired. ` +
      `<a href="login.html">Log in again</a>.</p>`;
  }
})();
