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
  // input.required() = a value the parent MUST pass in. Read it as course().
  readonly course = input.required<Course>();
  // computed() derives a value from a signal; it re-runs only when course changes.
  protected readonly hex = computed(() => COURSE_COLORS[this.course().color]);
}