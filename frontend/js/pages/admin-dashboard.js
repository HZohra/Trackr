/* Trackr — Admin dashboard. Renders skeletons, fills from the api seam, then wires the course and student search/filter controls. Read-only: every panel reflects data the database actually holds. */
import { getAdminMetrics, getRecentActivity, getAdminCourses, getStudents } from '../admin-api.js';
import { getUser, requireAuth } from '../auth.js';
import { statCard, statCardSkeleton } from '../components/statCard.js';

const $ = (s) => document.querySelector(s);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICON = {
  students:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  courses:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  assignments:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13l2 2 4-4"/></svg>',
  graded:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
};

/* course-code colour, derived deterministically from the code so the same
   course always lands on the same swatch (mirrors the dashboard course cards) */
const SWATCHES = ['var(--course-teal)','var(--course-sky)','var(--course-violet)','var(--course-coral)','var(--course-amber)','var(--course-lime)','var(--primary)'];
const colorFor = (s) => SWATCHES[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % SWATCHES.length];
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

const state = { courses: [], students: [], courseSearch: '', semester: 'all', studentSearch: '' };

/* ---------- skeletons ---------- */
function showSkeletons() {
  $('#adminMetrics').innerHTML = Array.from({ length: 4 }, statCardSkeleton).join('');
  $('#adminActivity').innerHTML =
    `<div class="dash-card__head"><h2>Recent activity</h2></div>` +
    `<ul class="afeed">${Array.from({ length: 5 }, () => `
      <li class="afeed__item"><span class="sk sk--dot"></span>
        <div class="afeed__body" style="flex:1">
          <div class="sk sk--line" style="width:70%"></div>
          <div class="sk sk--sm" style="width:35%"></div>
        </div></li>`).join('')}</ul>`;
  $('#adminCourseList').innerHTML = Array.from({ length: 3 }, () => `
    <div class="acard">
      <div class="sk sk--line" style="width:45%"></div>
      <div class="sk sk--line" style="width:70%;margin:.7rem 0 .4rem"></div>
      <div class="sk sk--sm" style="width:30%"></div>
    </div>`).join('');
  $('#adminStudents').innerHTML = Array.from({ length: 5 }, () => `
    <tr><td colspan="5"><div class="sk sk--line" style="width:100%;height:18px"></div></td></tr>`).join('');
}

/* ---------- metric cards ---------- */
function renderMetrics(m) {
  $('#adminMetrics').innerHTML = [
    statCard({ icon: ICON.students, value: m.totalStudents, label: 'Total Students', accent: 'primary', countup: true }),
    statCard({ icon: ICON.courses, value: m.totalCourses, label: 'Total Courses', accent: 'violet', countup: true }),
    statCard({ icon: ICON.assignments, value: m.totalActivities, label: 'Assignments Tracked', accent: 'progress', countup: true }),
    statCard({ icon: ICON.graded, value: m.gradedActivities, label: 'Graded', accent: 'marker', countup: true }),
  ].join('');
  animateCounts();
}
function animateCounts() {
  requestAnimationFrame(() => document.querySelectorAll('[data-countup]').forEach(countUp));
}
function countUp(el) {
  const target = parseFloat(el.dataset.countup), suffix = el.dataset.suffix || '';
  if (reduce) { el.textContent = target + suffix; return; }
  const t0 = performance.now(), dur = 900;
  const tick = (now) => {
    const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- recent activity ---------- */
/* `subject` and `context` come straight from user input (names, course codes,
   assignment titles), so every interpolation below goes through esc() — the
   only markup we emit is our own <b> around the entity. */
const EVENT_TYPES = new Set(['register', 'course', 'assignment']);

function eventText(a) {
  const subject = `<b>${esc(a.subject)}</b>`;
  if (a.type === 'register') return `New student registered — ${subject}`;
  if (a.type === 'course') {
    return `Course added — ${subject}${a.context ? ` by ${esc(a.context)}` : ''}`;
  }
  return `Assignment added — ${subject}${a.context ? ` in ${esc(a.context)}` : ''}`;
}

function renderActivity(items) {
  $('#adminActivity').innerHTML =
    `<div class="dash-card__head"><h2>Recent activity</h2></div>` +
    (items.length
      ? `<ul class="afeed">${items.map((a) => `
          <li class="afeed__item">
            <span class="afeed__dot afeed__dot--${EVENT_TYPES.has(a.type) ? a.type : 'register'}"></span>
            <div class="afeed__body">
              <p class="afeed__text">${eventText(a)}</p>
              <span class="afeed__time">${esc(a.time)}</span>
            </div>
          </li>`).join('')}</ul>`
      : `<div class="admin-empty"><b>No activity yet.</b><br>Platform events will show up here.</div>`);
}

/* ---------- course management ---------- */
function populateSemesterFilter() {
  const sel = $('#semesterFilter');
  const terms = [...new Set(state.courses.map((c) => c.semester))];
  sel.innerHTML = `<option value="all">All semesters</option>` +
    terms.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
}
function filteredCourses() {
  const q = state.courseSearch.toLowerCase();
  const matches = (v) => String(v).toLowerCase().includes(q);
  return state.courses.filter((c) =>
    (state.semester === 'all' || c.semester === state.semester) &&
    (!q || matches(c.code) || matches(c.name) || matches(c.professor) || matches(c.owner)));
}
function renderCourses() {
  const list = filteredCourses();
  if (!list.length) {
    $('#adminCourseList').innerHTML = `<div class="admin-empty"><b>No courses found.</b><br>Try a different search or semester.</div>`;
    return;
  }
  $('#adminCourseList').innerHTML = list.map((c) => `
    <article class="acard" style="--c:${colorFor(c.code)}">
      <div class="acard__head">
        <span class="acard__code">${esc(c.code)}</span>
      </div>
      <h3 class="acard__name">${esc(c.name)}</h3>
      <p class="acard__meta">${esc(c.semester)} · ${esc(c.professor)}</p>
      <div class="acard__foot">
        <span class="acard__stats">${esc(c.owner)} · <b>${c.activityCount}</b> assignment${c.activityCount === 1 ? '' : 's'}</span>
      </div>
    </article>`).join('');
}

/* ---------- student management ---------- */
function filteredStudents() {
  const q = state.studentSearch.toLowerCase();
  return state.students.filter((s) =>
    !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
}
function renderStudents() {
  const rows = filteredStudents();
  $('#studentCount').textContent = `${rows.length} of ${state.students.length}`;
  if (!rows.length) {
    $('#adminStudents').innerHTML = `<tr><td colspan="5"><div class="admin-empty"><b>No students match.</b><br>Clear the search to see everyone.</div></td></tr>`;
    return;
  }
  $('#adminStudents').innerHTML = rows.map((s) => `
    <tr>
      <td>
        <div class="atd-student">
          <span class="atd-student__avatar" style="background:${colorFor(s.name)}">${esc(initials(s.name))}</span>
          <span><span class="atd-student__name">${esc(s.name)}</span><span class="atd-student__email">${esc(s.email)}</span></span>
        </div>
      </td>
      <td data-num>${esc(s.id)}</td>
      <td data-num>${s.courses}</td>
      <td data-num>${s.assignments}</td>
      <td>${esc(s.joined)}</td>
    </tr>`).join('');
}

/* ---------- events ---------- */
function wireEvents() {
  $('#courseSearch').addEventListener('input', (e) => { state.courseSearch = e.target.value; renderCourses(); });
  $('#semesterFilter').addEventListener('change', (e) => { state.semester = e.target.value; renderCourses(); });
  $('#studentSearch').addEventListener('input', (e) => { state.studentSearch = e.target.value; renderStudents(); });
}

/* ---------- init ---------- */
async function init() {
  /* admin-only: relocate students before anything renders */
  if (!requireAuth()) return;
  if (getUser()?.role !== 'admin') {
    window.location.replace('dashboard.html');
    return;
  }

  showSkeletons();
  let metrics, activity, courses, students;
  try {
    [metrics, activity, courses, students] = await Promise.all([
      getAdminMetrics(), getRecentActivity(), getAdminCourses(), getStudents(),
    ]);
  } catch (e) {
    $('#adminActivity').innerHTML = `<div class="admin-empty"><b>Couldn't load the dashboard.</b><br>Please refresh to try again.</div>`;
    return;
  }
  state.courses = courses;
  state.students = students;

  renderMetrics(metrics);
  renderActivity(activity);
  populateSemesterFilter();
  renderCourses();
  renderStudents();
  wireEvents();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();