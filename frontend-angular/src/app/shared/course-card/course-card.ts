import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Course, COURSE_COLORS } from '../../core/models/course';

@Component({
  selector: 'app-course-card',
  imports: [RouterLink],
  templateUrl: './course-card.html',
  styleUrl: './course-card.css',
})
export class CourseCard {
  readonly course = input.required<Course>();
  /** Optional "Next · …" hint (e.g. the next upcoming assignment). */
  readonly nextLabel = input<string | null>(null);

  /** The course's own colour (the 8-colour palette) — used for the top bar. */
  protected readonly hex = computed(() => COURSE_COLORS[this.course().color]);

  /** Grade-band colour: green (strong) / amber (watch) / red (at risk) / muted (none yet). */
  protected readonly gradeColor = computed(() => {
    const g = this.course().currentGrade;
    if (g === null) return 'var(--muted)';
    if (g >= 80) return 'var(--leaf)';
    if (g >= 60) return 'var(--amber)';
    return 'var(--danger)';
  });
}