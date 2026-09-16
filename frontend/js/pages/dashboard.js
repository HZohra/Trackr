/* Trackr — Dashboard page. Renders skeletons, then fills from the api seam. */
import { getCurrentUser, getSemester, getCourses, getActivities } from '../api.js';
import { statCard, statCardSkeleton } from '../components/statCard.js';
import { assignmentRow, assignmentRowSkeleton } from '../components/assignmentRow.js';
import { courseCard, courseCardSkeleton } from '../components/courseCard.js';
import { progressBar } from '../components/progressBar.js';
import { getUser } from '../auth.js';

const $ = (s) => document.querySelector(s);
const DAY = 86400000;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const storedUser = getUser();
if (storedUser?.first_name) $('#dashName').textContent = storedUser.first_name;

const ICON = {
  gpa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>',
  courses:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  due:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

function showSkeletons() {
  $('#dashStats').innerHTML = Array.from({ length: 3 }, statCardSkeleton).join('');
  $('#dashUpcoming').innerHTML = Array.from({ length: 6 }, assignmentRowSkeleton).join('');
  $('#dashCourses').innerHTML = Array.from({ length: 5 }, courseCardSkeleton).join('');
  $('#dashGpa').innerHTML = `<div class="sk sk--line" style="width:40%"></div><div class="sk sk--num" style="margin:.8rem 0"></div><div class="sk sk--bar"></div>`;
}

function animate() {
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w + '%'; });
    document.querySelectorAll('[data-countup]').forEach(countUp);
  });
}
function countUp(el) {
  const target = parseFloat(el.dataset.countup); const suffix = el.dataset.suffix || '';
  const decimals = (String(el.dataset.countup).split('.')[1] || '').length;
  if (reduce) { el.textContent = target.toFixed(decimals) + suffix; return; }
  const t0 = performance.now(), dur = 900;
  const tick = (now) => {
    const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * e).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function init() {
  showSkeletons();
  let user, semester, courses, activities;
  try {
    [user, semester, courses, activities] = await Promise.all([
      getCurrentUser(), getSemester(), getCourses(), getActivities(),
    ]);
  } catch (e) {
    $('#dashUpcoming').innerHTML = `<li class="dash-empty">Couldn't load your dashboard. Please refresh.</li>`;
    return;
  }

  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const t0 = new Date(); t0.setHours(0, 0, 0, 0); const today = t0.getTime();
  const dayOf = (iso) => { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const active = activities.filter((a) => a.status === 'not_started' || a.status === 'in_progress');
  const overdue = active.filter((a) => dayOf(a.dueDate) < today);
  const dueThisWeek = active.filter((a) => { const d = dayOf(a.dueDate); return d >= today && d <= today + 7 * DAY; });

  /* greeting */
  $('#dashName').textContent = user.firstName;
  $('#dashStatus').textContent = !activities.length
    ? `Upload a syllabus to start tracking your semester.`
    : overdue.length
      ? `${overdue.length} item${overdue.length > 1 ? 's' : ''} need${overdue.length > 1 ? '' : 's'} attention this week.`
      : `You're all caught up this week. Nice work.`;

  /* stat cards (3): GPA · Active Courses · Due This Week */
  const gpaTile = user.currentGPA == null
    ? statCard({ icon: ICON.gpa, value: '—', label: 'Current GPA', accent: 'primary', sub: 'Add grades to see your GPA' })
    : statCard({ icon: ICON.gpa, value: user.currentGPA.toFixed(2), label: 'Current GPA', accent: 'primary', countup: true,
        sub: `on a ${user.gpaScale.toFixed(1)} scale` });

  $('#dashStats').innerHTML = [
    gpaTile,
    statCard({ icon: ICON.courses, value: courses.length, label: 'Active Courses', accent: 'violet',
      sub: semester.term || (courses.length ? `${courses.length} enrolled` : 'No courses yet') }),
    statCard({ icon: ICON.due, value: dueThisWeek.length, label: 'Due This Week', accent: 'progress',
      sub: overdue.length ? `${overdue.length} overdue` : 'Nothing overdue' }),
  ].join('');

  /* upcoming */
  const upcoming = [...active].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 7);
  $('#dashUpcoming').innerHTML = upcoming.length
    ? upcoming.map((a) => assignmentRow(a, byId[a.courseId])).join('')
    : `<li class="dash-empty"><b>Nothing due right now.</b><span>Upload a syllabus to start tracking a course.</span></li>`;

  /* GPA summary */
  const displayGpa = user.currentGPA != null ? user.currentGPA : user.cumulativeGPA;
  if (displayGpa == null) {
    $('#dashGpa').innerHTML = `
      <div class="dash-card__head"><h2>GPA Summary</h2></div>
      <div class="dash-empty"><b>No grades yet.</b><span>Add grades to track your GPA.</span></div>`;
  } else {
    const gpaPct = Math.round((displayGpa / user.gpaScale) * 100);
    const cumHtml = user.cumulativeGPA != null
      ? `<div class="gpa-cum"><b>${user.cumulativeGPA.toFixed(2)}</b><span>Cumulative</span></div>`
      : '';
    $('#dashGpa').innerHTML = `
      <div class="dash-card__head"><h2>GPA Summary</h2></div>
      <div class="gpa-row">
        <div><span class="gpa-big" data-countup="${displayGpa.toFixed(2)}">0.00</span><span class="gpa-scale">/ ${user.gpaScale.toFixed(1)}</span><p class="gpa-cap">This term</p></div>
        ${cumHtml}
      </div>
      ${progressBar(gpaPct)}`;
  }

  /* courses */
  $('#dashCourses').innerHTML = courses.length
    ? courses.map(courseCard).join('')
    : `<div class="dash-empty"><b>No courses yet.</b><span>Upload a syllabus to add one.</span></div>`;

  animate();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
