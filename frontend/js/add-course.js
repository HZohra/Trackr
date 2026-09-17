/* Add Course — manual entry.
   Same form and payload as the syllabus review screen (extraction-review.js),
   but starts blank and POSTs straight to the backend. No file upload involved.
   The backend endpoint (POST /user/courses) is the transactional
   createCourseWithActivities path, so the course and all its activities are
   saved atomically. */

import { API_BASE, authHeaders, requireAuth } from "./auth.js";

if (requireAuth()) {
  const $ = (id) => document.getElementById(id);
  const activitiesBody = $("activitiesBody");
  const rowTemplate = $("rowTemplate");
  const formError = $("formError");
  const saveBtn = $("saveBtn");

  // Clone one blank activity row into the table.
  function addRow() {
    const frag = rowTemplate.content.cloneNode(true);
    activitiesBody.appendChild(frag);
  }

  // Start with a single empty row so the table isn't blank.
  addRow();

  $("addBtn").addEventListener("click", () => addRow());

  // Remove a row, and clear the invalid highlight as the user edits.
  activitiesBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-btn")) {
      e.target.closest(".act-row").remove();
    }
  });
  activitiesBody.addEventListener("input", (e) => {
    e.target.classList.remove("is-invalid");
    formError.textContent = "";
  });

  // --- Save ---
  saveBtn.addEventListener("click", async () => {
    formError.textContent = "";

    const course_code = $("c-code").value.trim();
    const course_name = $("c-name").value.trim();
    const term = $("c-term").value.trim();

    // course_code, course_name, and term are all required by the backend.
    if (!course_code || !course_name || !term) {
      formError.textContent =
        "Course code, course name, and term are required.";
      (!course_code ? $("c-code") : !course_name ? $("c-name") : $("c-term")).focus();
      return;
    }

    const rows = [...activitiesBody.querySelectorAll(".act-row")];
    let firstBad = null;
    const outActivities = [];

    for (const row of rows) {
      const nameEl = row.querySelector(".act-name");
      const dueEl = row.querySelector(".act-due");
      const name = nameEl.value.trim();
      const due = dueEl.value;

      // A completely blank row is fine on the manual form — a user may add a
      // course before they know any assignments. Only validate rows the user
      // actually started filling in.
      const weightRaw = row.querySelector(".act-weight").value;
      const touched = name || due || weightRaw;
      if (!touched) continue;

      if (!name) { nameEl.classList.add("is-invalid"); firstBad ||= nameEl; }
      if (!due) { dueEl.classList.add("is-invalid"); firstBad ||= dueEl; }
      if (!name || !due) continue;

      outActivities.push({
        activity_category_id: Number(row.querySelector(".act-category").value),
        activity_name: name,
        due_date: due, // date-only; backend normalizes to 'YYYY-MM-DD 23:59:00'
        grading_weight: weightRaw === "" ? 0 : Number(weightRaw),
        reminder_date: row.querySelector(".act-reminder").value || null,
        reminder_method: row.querySelector(".act-method").value,
        priority_level: row.querySelector(".act-priority").value,
      });
    }

    if (firstBad) {
      formError.textContent = "Every activity you add needs a name and a due date.";
      firstBad.focus();
      return;
    }

    const gpaRaw = $("c-gpa").value;
    const body = {
      course: {
        course_code,
        course_name,
        term,
        professor_name: $("c-prof").value.trim(),
        office_hours: $("c-office").value.trim(),
        meeting_times: $("c-meeting").value.trim(),
        room: $("c-room").value.trim(),
        textbook_link: $("c-textbook").value.trim(),
        gpa_goal: gpaRaw === "" ? null : Number(gpaRaw),
      },
      activities: outActivities,
    };

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      const res = await fetch(API_BASE + "/user/courses", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let message = "Could not save the course.";
        try {
          const data = await res.json();
          if (data.errors && data.errors.length) message = data.errors.join(" · ");
          else if (data.message) message = data.message;
        } catch (_) {}
        throw new Error(message);
      }

      // Full page navigation refreshes the cached course/activity data.
      window.location.href = "courses.html";
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Add course";
      formError.textContent =
        err.message === "Failed to fetch"
          ? "Could not reach the server. Is the backend running on port 5000?"
          : err.message;
    }
  });
}