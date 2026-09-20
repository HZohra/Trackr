import { Activity } from './models/activity';

const weightOf = (a: Activity): number => (a.grading_weight != null ? Number(a.grading_weight) : 0);

// Weighted average of graded assignments (weight falls back to 1 if unset). Null if none graded.
export function weightedGrade(activities: Activity[]): number | null {
  const graded = activities.filter((a) => a.grade != null);
  if (!graded.length) return null;
  let sumW = 0, sumGW = 0;
  for (const a of graded) {
    const w = weightOf(a) > 0 ? weightOf(a) : 1;
    sumW += w;
    sumGW += Number(a.grade) * w;
  }
  return sumW ? sumGW / sumW : null;
}

// Share of total weight that has a grade recorded (the progress bar).
export function percentComplete(activities: Activity[]): number {
  const total = activities.reduce((s, a) => s + Math.max(weightOf(a), 0), 0);
  if (!total) return 0;
  const done = activities.filter((a) => a.grade != null).reduce((s, a) => s + Math.max(weightOf(a), 0), 0);
  return Math.round((done / total) * 100);
}

// Sum of all assignment weights — used to flag when a course isn't at 100%.
export function totalWeight(activities: Activity[]): number {
  return activities.reduce((s, a) => s + weightOf(a), 0);
}