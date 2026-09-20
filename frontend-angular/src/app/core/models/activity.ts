export interface Activity {
  activity_id: number;
  course_id: number;
  activity_category_id: number;
  activity_name: string;
  due_date: string | null;
  grading_weight: string | number | null; // pg returns NUMERIC as a string
  grade: string | number | null;
  status: string;
}

export const CATEGORY_ID_TO_NAME: Record<number, string> = {
  1: 'Assignment', 2: 'Quiz', 3: 'Exam', 4: 'Project', 5: 'Lab', 6: 'Other',
};