import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  Course,
  COURSE_COLORS,
} from '../../core/models/course';

export type CourseCardVariant =
  | 'compact'
  | 'detailed';

@Component({
  selector: 'app-course-card',
  imports: [RouterLink],
  templateUrl: './course-card.html',
  styleUrl: './course-card.css',
})
export class CourseCard {
  readonly course =
    input.required<Course>();

  readonly variant =
    input<CourseCardVariant>('compact');

  readonly nextLabel =
    input<string | null>(null);

  /*
   * Required because Dashboard currently passes
   * [health]="health()[course.id] ?? null"
   */
  readonly health =
    input<unknown | null>(null);

  protected readonly hex = computed(() =>
    COURSE_COLORS[this.course().color],
  );

  protected readonly gradeColor = computed(() => {
    const grade = this.course().currentGrade;

    if (grade === null) {
      return 'var(--muted)';
    }

    if (grade >= 80) {
      return 'var(--leaf)';
    }

    if (grade >= 60) {
      return 'var(--amber)';
    }

    return 'var(--danger)';
  });
}