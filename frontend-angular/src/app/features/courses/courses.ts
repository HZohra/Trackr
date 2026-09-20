import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CourseCard } from '../../shared/course-card/course-card';
import { Course } from '../../core/models/course';
import { CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-courses',
  imports: [CourseCard, RouterLink],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses {
  private readonly courseService = inject(CourseService);

  protected readonly courses = signal<Course[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.courseService.getCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your courses.');
        this.loading.set(false);
      },
    });
  }
}