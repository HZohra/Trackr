export type GpaScaleId = 'gpa4' | 'gpa433' | 'gpa12' | 'mcgill' | 'custom';

export interface GradeBand { min: number; letter: string; points: number | null; }
export interface GpaScale {
  id: GpaScaleId;
  label: string;
  max: number | null;   // null = percentage-based, no GPA number
  bands: GradeBand[];    // highest min first
}
export interface GradePoint { letter: string; points: number | null; }

export const GPA_SCALES: readonly GpaScale[] = [
  {
    id: 'gpa4',
    label: '4.0 scale',
    max: 4,
    bands: [
      { min: 90, letter: 'A+', points: 4.0 },
      { min: 85, letter: 'A', points: 4.0 },
      { min: 80, letter: 'A-', points: 3.7 },
      { min: 77, letter: 'B+', points: 3.3 },
      { min: 73, letter: 'B', points: 3.0 },
      { min: 70, letter: 'B-', points: 2.7 },
      { min: 67, letter: 'C+', points: 2.3 },
      { min: 63, letter: 'C', points: 2.0 },
      { min: 60, letter: 'C-', points: 1.7 },
      { min: 57, letter: 'D+', points: 1.3 },
      { min: 53, letter: 'D', points: 1.0 },
      { min: 50, letter: 'D-', points: 0.7 },
      { min: 0, letter: 'F', points: 0.0 },
    ],
  },
  {
    id: 'gpa433',
    label: '4.33',
    max: 4.33,
    bands: [
      { min: 90, letter: 'A+', points: 4.33 },
      { min: 85, letter: 'A', points: 4.0 },
      { min: 80, letter: 'A-', points: 3.67 },
      { min: 76, letter: 'B+', points: 3.33 },
      { min: 72, letter: 'B', points: 3.0 },
      { min: 68, letter: 'B-', points: 2.67 },
      { min: 64, letter: 'C+', points: 2.33 },
      { min: 60, letter: 'C', points: 2.0 },
      { min: 55, letter: 'C-', points: 1.67 },
      { min: 50, letter: 'D', points: 1.0 },
      { min: 0, letter: 'F', points: 0.0 },
    ],
  },
  {
    id: 'gpa12',
    label: '12-point',
    max: 12,
    bands: [
      { min: 90, letter: 'A+', points: 12 },
      { min: 85, letter: 'A', points: 11 },
      { min: 80, letter: 'A-', points: 10 },
      { min: 77, letter: 'B+', points: 9 },
      { min: 73, letter: 'B', points: 8 },
      { min: 70, letter: 'B-', points: 7 },
      { min: 67, letter: 'C+', points: 6 },
      { min: 63, letter: 'C', points: 5 },
      { min: 60, letter: 'C-', points: 4 },
      { min: 57, letter: 'D+', points: 3 },
      { min: 53, letter: 'D', points: 2 },
      { min: 50, letter: 'D-', points: 1 },
      { min: 0, letter: 'F', points: 0 },
    ],
  },
  {
    id: 'mcgill',
    label: 'Percentage',
    max: null,
    bands: [
      { min: 85, letter: 'A', points: null },
      { min: 80, letter: 'A-', points: null },
      { min: 75, letter: 'B+', points: null },
      { min: 70, letter: 'B', points: null },
      { min: 65, letter: 'C+', points: null },
      { min: 60, letter: 'C', points: null },
      { min: 55, letter: 'D', points: null },
      { min: 0, letter: 'F', points: null },
    ],
  },
];

/** A fresh, editable copy of the 4.0 bands — the starting point for a custom scale. */
export function defaultCustomBands(): GradeBand[] {
  const base = GPA_SCALES.find((s) => s.id === 'gpa4');
  return (base ? base.bands : []).map((b) => ({ ...b }));
}

/** Build a scale object from user-edited bands (sorted, with a derived max). */
export function makeCustomScale(bands: GradeBand[]): GpaScale {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  const max = Math.max(0, ...sorted.map((b) => b.points ?? 0));
  return { id: 'custom', label: 'Custom', max, bands: sorted };
}

export function scaleById(id: GpaScaleId): GpaScale {
  return GPA_SCALES.find((s) => s.id === id) ?? GPA_SCALES[0];
}

export function gradePoint(percent: number, scale: GpaScale): GradePoint {
  const row = scale.bands.find((b) => percent >= b.min) ?? scale.bands[scale.bands.length - 1];
  return { letter: row.letter, points: row.points };
}