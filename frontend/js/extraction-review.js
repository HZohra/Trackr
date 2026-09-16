/* Extraction Review — Step 4.
   Renders the { course, activities } returned by the extractor (handed over via
   sessionStorage), lets the student edit/add/remove, then POSTs the confirmed
   course to the backend. Nothing was saved before this point. */

import { API_BASE, authHeaders, requireAuth } from "./auth.js";

const CATEGORY_NAME_TO_ID = { Assignment: 1, Quiz: 2, Exam: 3, Project: 4 };

if (requireAuth()) {
  const stored = sessionStorage.getItem("trackr-extraction");
  if (!stored) {
    // Nothing to review — send them back to start the flow.
    window.location.href = "upload-syllabus.html";
  } else {
    const payload = JSON.parse(stored);
    const course = payload.course || {};
    const activities = payload.activities || [];

    const $ = (id) => document.getElementById(id);
    const activitiesBody = $("activitiesBody");
    const rowTemplate = $("rowTemplate");
    const formError = $("formError");
    const saveBtn = $("saveBtn");

    // --- Fill course fields ---
    const setVal = (id, v) => ($(id).value = v == null ? "" : v);
    setVal("c-code", course.course_code);
    setVal("c-name", course.course_name);
    setVal("c-term", course.term || payload.term || "");
    setVal("c-prof", course.professor_name);
    setVal("c-meeting", course.meeting_times);
    setVal("c-room", course.room);
    setVal("c-office", course.office_hours);
    setVal("c-textbook", course.textbook_link);
    setVal("c-gpa", course.gpa_goal);

    // --- Render one activity row ---
    function addRow(activity = {}) {
      const frag = rowTemplate.content.cloneNode(true);
      const row = frag.querySelector(".act-row");

      row.querySelector(".act-name").value = activity.activity_name || "";
      const catId = CATEGORY_NAME_TO_ID[activity.activity_category] || 1;
      row.querySelector(".act-category").value = String(catId);
      // Extractor due_date is "YYYY-MM-DD HH:MM:SS"; the date input wants the date part.
      row.querySelector(".act-due").value = activity.due_date
        ? String(activity.due_date).slice(0, 10)
        : "";
      row.querySelector(".act-weight").value =
        activity.grading_weight != null ? activity.grading_weight : "";

      activitiesBody.appendChild(frag);
    }

    activities.forEach(addRow);
    if (activities.length === 0) addRow();

    $("addBtn").addEventListener("click", () => addRow());

    // Remove row + clear invalid highlight on edit (event delegation).
    activitiesBody.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-btn")) {
        e.target.closest(".act-row").remove();
      }
    });
    activitiesBody.addEventListener("input", (e) => {
      e.target.classList.remove("is-invalid");
      formError.textContent = "";
    });

    // --- Confirm & save ---
    saveBtn.addEventListener("click", async () => {
      formError.textContent = "";

      const course_code = $("c-code").value.trim();
      const course_name = $("c-name").value.trim();
      if (!course_code || !course_name) {
        formError.textContent = "Course code and course name are required.";
        ($("c-code").value.trim() ? $("c-name") : $("c-code")).focus();
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

        if (!name) { nameEl.classList.add("is-invalid"); firstBad ||= nameEl; }
        if (!due) { dueEl.classList.add("is-invalid"); firstBad ||= dueEl; }
        if (!name || !due) continue;

        const weightRaw = row.querySelector(".act-weight").value;
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
        formError.textContent = "Every activity needs a name and a due date.";
        firstBad.focus();
        return;
      }

      const gpaRaw = $("c-gpa").value;
      const body = {
        course: {
          course_code,
          course_name,
          term: $("c-term").value.trim(),
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

        sessionStorage.removeItem("trackr-extraction");
        window.location.href = "dashboard.html";
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Confirm & add course";
        formError.textContent =
          err.message === "Failed to fetch"
            ? "Could not reach the server. Is the backend running on port 5000?"
            : err.message;
      }
    });
  }
}
