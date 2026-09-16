const DAY = 86400000;
function dueLabel(dueISO) {
  const due = new Date(dueISO); const now = new Date();
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d1 = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((d1 - d0) / DAY);
  if (diff < 0) return { text: `${-diff} day${diff === -1 ? '' : 's'} overdue`, overdue: true };
  if (diff === 0) return { text: 'Due today', soon: true };
  if (diff === 1) return { text: 'Due tomorrow', soon: true };
  if (diff <= 6) return { text: 'Due ' + due.toLocaleDateString('en-US', { weekday: 'long' }) };
  return { text: 'Due ' + due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
}
const STATUS = {
  not_started: { cls: 'neutral', label: 'Not started' },
  in_progress: { cls: 'progress', label: 'In progress' },
  submitted:   { cls: 'info',     label: 'Submitted' },
  graded:      { cls: 'success',  label: 'Graded' },
};
export function assignmentRow(a, course) {
  const due = dueLabel(a.dueDate);
  const overdue = due.overdue && a.status !== 'submitted' && a.status !== 'graded';
  const s = STATUS[a.status] || STATUS.not_started;
  const pill = overdue
    ? `<span class="pill pill--danger">Needs attention</span>`
    : a.status === 'graded'
      ? `<span class="pill pill--success">${a.grade}%</span>`
      : `<span class="pill pill--${s.cls}">${s.label}</span>`;
  return `
    <li class="arow${overdue ? ' is-overdue' : ''}">
      <span class="arow__dot" style="background:var(--course-${course.color})"></span>
      <div class="arow__main">
        <b class="arow__name">${a.name}</b>
        <span class="arow__meta">${course.code} · ${a.category} · ${a.weight}% · <span class="${overdue ? 'arow__overdue' : ''}">${due.text}</span></span>
      </div>
      ${pill}
    </li>`;
}
export function assignmentRowSkeleton() {
  return `<li class="arow"><span class="sk sk--dot"></span>
    <div class="arow__main"><div class="sk sk--line" style="width:60%"></div><div class="sk sk--line sk--sm" style="width:40%"></div></div>
    <span class="sk sk--pill"></span></li>`;
}