import { Activity } from './models/activity';
import { GpaScale, GradeBand } from './gpa';

const weightOf = (a: Activity): number => {
  const w = Number(a.grading_weight);
  return Number.isFinite(w) && w > 0 ? w : 0;
};
const dueTime = (a: Activity): number => {
  const t = a.due_date ? new Date(a.due_date).getTime() : NaN;
  return Number.isNaN(t) ? Infinity : t;
};

export interface CourseHealth {
  /** Running weighted grade after each graded item, oldest first (for the sparkline). */
  trend: number[];
  /** Grade band the student is protecting (or climbing into, if failing). */
  target: GradeBand | null;
  /** Average needed on the remaining weight to finish at `target.min`. Null if nothing left to earn. */
  needed: number | null;
  /** Best final grade still possible (100% on everything left). */
  maxPossible: number | null;
  /** True when holding the target needs ≥ 90% on the rest, or is impossible. */
  atRisk: boolean;
}

/**
 * Everything the course-health card shows, from raw activities.
 * Only weighted activities count toward the "needed" math — unweighted ones
 * can't move the final grade in a knowable way.
 */
export function courseHealth(activities: Activity[], scale: GpaScale): CourseHealth {
  const weighted = activities.filter((a) => weightOf(a) > 0);
  const graded = weighted
    .filter((a) => a.grade != null)
    .sort((x, y) => dueTime(x) - dueTime(y));

  const trend: number[] = [];
  let sumW = 0, sumGW = 0;
  for (const a of graded) {
    sumW += weightOf(a);
    sumGW += Number(a.grade) * weightOf(a);
    trend.push(sumGW / sumW);
  }

  const empty: CourseHealth = { trend, target: null, needed: null, maxPossible: null, atRisk: false };
  if (!graded.length) return empty;

  const totalW = weighted.reduce((s, a) => s + weightOf(a), 0);
  const remainingW = totalW - sumW;
  if (remainingW <= 0) return empty;

  const current = sumGW / sumW;
  const bands = [...scale.bands].sort((a, b) => b.min - a.min);
  const inBand = bands.find((b) => current >= b.min) ?? bands[bands.length - 1];
  // Failing? Aim for the lowest passing band instead of "holding an F".
  const target = inBand.min === 0 ? bands[bands.length - 2] ?? inBand : inBand;

  const needed = (target.min * totalW - sumGW) / remainingW;
  const maxPossible = (sumGW + 100 * remainingW) / totalW;

  return {
    trend,
    target,
    needed: Math.max(0, needed),
    maxPossible,
    atRisk: needed >= 90,
  };
}