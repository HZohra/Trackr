import { Activity } from './models/activity';

const HOUR = 3_600_000;

/**
 * How quickly an overdue item fades from the top of the list.
 * Right at the deadline an item counts as "due within the hour"; after 48h
 * its urgency has dropped to ~37% (e^-1), and after a week it is effectively gone,
 * so abandoned work can't hold the "Your next move" slot forever.
 */
export const OVERDUE_DECAY_HOURS = 48;

export function priorityScore(a: Activity, now = Date.now()): number {
  if (!a.due_date) return -Infinity;
  const due = new Date(a.due_date).getTime();
  if (Number.isNaN(due)) return -Infinity;

  const weight = Number(a.grading_weight) || 1;
  const hoursLeft = (due - now) / HOUR;

  // Upcoming: 1 / hours left (floored at 1h). Overdue: starts at 1 (continuous
  // with the upcoming curve at the deadline) and decays exponentially.
  const urgency =
    hoursLeft > 0
      ? 1 / Math.max(hoursLeft, 1)
      : Math.exp(-(-hoursLeft) / OVERDUE_DECAY_HOURS);

  return weight * urgency;
}

// Still needs the student's attention: has a date, not yet submitted or graded.
export function isOpen(a: Activity): boolean {
  return !!a.due_date && a.grade == null && a.status !== 'submitted' && a.status !== 'graded';
}

export function rankPending(activities: Activity[], now = Date.now()): Activity[] {
  return activities.filter(isOpen).sort((x, y) => priorityScore(y, now) - priorityScore(x, now));
}

export type PriorityReason = 'overdue' | 'due-soonest' | 'highest-impact';

/**
 * Why `top` is ranked first — so the UI label matches the actual logic
 * instead of always claiming "due soonest".
 */
export function priorityReason(top: Activity, pending: Activity[], now = Date.now()): PriorityReason {
  const due = new Date(top.due_date as string).getTime();
  if (due < now) return 'overdue';
  const soonest = pending
    .filter((a) => new Date(a.due_date as string).getTime() >= now)
    .reduce<Activity | null>(
      (best, a) =>
        !best || new Date(a.due_date as string).getTime() < new Date(best.due_date as string).getTime() ? a : best,
      null,
    );
  return soonest?.activity_id === top.activity_id ? 'due-soonest' : 'highest-impact';
}