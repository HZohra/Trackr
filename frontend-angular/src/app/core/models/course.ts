export type CourseColor =
  | 'sky' | 'violet' | 'amber' | 'coral'
  | 'teal' | 'lime' | 'rose' | 'slate';

export interface Course {
  id: number;
  code: string;
  name: string;
  professor: string;
  color: CourseColor;
  currentGrade: number | null; // percent, or null if nothing graded yet
  percentComplete: number;     // 0–100
}

// The exact palette from your original tokens.css — one source of truth.
export const COURSE_COLORS: Record<CourseColor, string> = {
  sky: '#0EA5E9',
  violet: '#8B5CF6',
  amber: '#F59E0B',
  coral: '#FB7185',
  teal: '#14B8A6',
  lime: '#84CC16',
  rose: '#F43F5E',
  slate: '#64748B',
};

export function colorForCourse(courseId: number): CourseColor {
  const palette: CourseColor[] = ['sky', 'violet', 'amber', 'coral', 'teal', 'lime', 'rose', 'slate'];
  return palette[courseId % palette.length];
}