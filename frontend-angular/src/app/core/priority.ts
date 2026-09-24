import { Activity } from './models/activity';

// Higher score = more deserving of attention now. Combines how soon something
// is due with how much it's worth, so a heavy assessment due soon outranks a
// tiny one due tomorrow. Only open, dated, ungraded items compete.
export function priorityScore(a: Activity, now = Date.now()): number {
  if (!a.due_date) return -Infinity;
  const due = new Date(a.due_date).getTime();
  if (Number.isNaN(due)) return -Infinity;
  const weight = Number(a.grading_weight) || 1;
  const hoursLeft = (due - now) / 3_600_000;
  // Overdue is urgent but capped; soon-and-heavy ranks highest.
  const urgency = hoursLeft <= 0 ? 1.5 : 1 / Math.max(hoursLeft, 1);
  return weight * urgency;
}

export function isOpen(a: Activity): boolean {
  return a.grade == null && a.status !== 'completed' && !!a.due_date;
}

// Open items, most important first.
export function rankPending(activities: Activity[], now = Date.now()): Activity[] {
  return activities.filter(isOpen).sort((x, y) => priorityScore(y, now) - priorityScore(x, now));
}