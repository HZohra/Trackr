import { Activity } from './models/activity';

export function priorityScore(a: Activity, now = Date.now()): number {
  if (!a.due_date) return -Infinity;
  const due = new Date(a.due_date).getTime();
  if (Number.isNaN(due)) return -Infinity;
  const weight = Number(a.grading_weight) || 1;
  const hoursLeft = (due - now) / 3_600_000;
  const urgency = hoursLeft <= 0 ? 1.5 : 1 / Math.max(hoursLeft, 1);
  return weight * urgency;
}

// Still needs the student's attention: has a date, not yet submitted or graded.
export function isOpen(a: Activity): boolean {
  return !!a.due_date && a.grade == null && a.status !== 'submitted' && a.status !== 'graded';
}

export function rankPending(activities: Activity[], now = Date.now()): Activity[] {
  return activities.filter(isOpen).sort((x, y) => priorityScore(y, now) - priorityScore(x, now));
}