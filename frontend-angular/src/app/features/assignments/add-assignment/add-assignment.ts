import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ActivityService } from '../../../core/services/activity.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course';

@Component({
  selector: 'app-add-assignment',
  imports: [ReactiveFormsModule],
  templateUrl: './add-assignment.html',
  styleUrl: './add-assignment.css',
})
export class AddAssignment {
  private readonly fb = inject(FormBuilder);
  private readonly activityService = inject(ActivityService);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly courses = signal<Course[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly categories = [
    { id: 1, name: 'Assignment' }, { id: 2, name: 'Quiz' },
    { id: 3, name: 'Exam' }, { id: 4, name: 'Project' },
    { id: 5, name: 'Lab' }, { id: 6, name: 'Other' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    courseId: [0, [Validators.required, Validators.min(1)]],
    categoryId: [1, [Validators.required]],
    name: ['', [Validators.required]],
    dueDate: ['', [Validators.required]],
    weight: [0],
  });

  constructor() {
    // If we arrived from a course page (?course=NN), preselect that course.
    const preselect = Number(this.route.snapshot.queryParamMap.get('course'));
    if (preselect) this.form.patchValue({ courseId: preselect });

    this.courseService.getCourses().subscribe({
      next: (courses) => this.courses.set(courses),
      error: () => this.error.set('Could not load your courses.'),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.activityService.addActivity({
      courseId: Number(v.courseId),
      categoryId: Number(v.categoryId),
      name: v.name,
      dueDate: v.dueDate.replace('T', ' '), // 'YYYY-MM-DDTHH:MM' -> 'YYYY-MM-DD HH:MM'
      weight: Number(v.weight),
    }).subscribe({
      next: () => this.router.navigateByUrl('/assignments'),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.errors?.[0] ?? err?.error?.message ?? 'Could not add the assignment.');
      },
    });
  }
}
