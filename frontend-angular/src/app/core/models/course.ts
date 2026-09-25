export type CourseColor =
  | 'sky'
  | 'violet'
  | 'amber'
  | 'coral'
  | 'teal'
  | 'lime'
  | 'rose'
  | 'slate';

export interface Course {
  id: number;
  code: string;
  name: string;
  professor: string;

  color: CourseColor;

  currentGrade: number | null;
  percentComplete: number;
  archived: boolean;
}

export interface CourseTheme {
  key: CourseColor;
  label: string;
  solid: string;
  gradient: string;
}

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

export const COURSE_GRADIENTS: Record<CourseColor, string> = {
  sky: 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)',
  violet: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
  amber: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
  coral: 'linear-gradient(135deg, #FB7185 0%, #F472B6 100%)',
  teal: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
  lime: 'linear-gradient(135deg, #65A30D 0%, #84CC16 100%)',
  rose: 'linear-gradient(135deg, #E11D48 0%, #FB7185 100%)',
  slate: 'linear-gradient(135deg, #475569 0%, #64748B 100%)',
};

export const COURSE_THEME_OPTIONS: CourseTheme[] = [
  {
    key: 'sky',
    label: 'Sky',
    solid: COURSE_COLORS.sky,
    gradient: COURSE_GRADIENTS.sky,
  },
  {
    key: 'violet',
    label: 'Violet',
    solid: COURSE_COLORS.violet,
    gradient: COURSE_GRADIENTS.violet,
  },
  {
    key: 'amber',
    label: 'Amber',
    solid: COURSE_COLORS.amber,
    gradient: COURSE_GRADIENTS.amber,
  },
  {
    key: 'coral',
    label: 'Coral',
    solid: COURSE_COLORS.coral,
    gradient: COURSE_GRADIENTS.coral,
  },
  {
    key: 'teal',
    label: 'Teal',
    solid: COURSE_COLORS.teal,
    gradient: COURSE_GRADIENTS.teal,
  },
  {
    key: 'lime',
    label: 'Lime',
    solid: COURSE_COLORS.lime,
    gradient: COURSE_GRADIENTS.lime,
  },
  {
    key: 'rose',
    label: 'Rose',
    solid: COURSE_COLORS.rose,
    gradient: COURSE_GRADIENTS.rose,
  },
  {
    key: 'slate',
    label: 'Slate',
    solid: COURSE_COLORS.slate,
    gradient: COURSE_GRADIENTS.slate,
  },
];

export function colorForCourse(
  courseId: number,
): CourseColor {
  const palette: CourseColor[] = [
    'sky',
    'violet',
    'amber',
    'coral',
    'teal',
    'lime',
    'rose',
    'slate',
  ];

  return palette[courseId % palette.length];
}

export function isCourseColor(
  value: unknown,
): value is CourseColor {
  return (
    typeof value === 'string' &&
    [
      'sky',
      'violet',
      'amber',
      'coral',
      'teal',
      'lime',
      'rose',
      'slate',
    ].includes(value)
  );
}

export function courseColorFromStored(
  value: unknown,
  courseId: number,
): CourseColor {
  return isCourseColor(value)
    ? value
    : colorForCourse(courseId);
}