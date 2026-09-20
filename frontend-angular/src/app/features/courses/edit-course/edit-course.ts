import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';

@Component({
  selector: 'app-edit-course',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-course.html',
  styleUrl: './edit-course.css',
})
export class EditCourse {
  private readonly fb = inject(FormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly courseId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    courseCode: ['', [Validators.required]],
    courseName: ['', [Validators.required]],
    term: ['', [Validators.required]],
    professor: [''],
    termEnd: [''],
  });

  constructor() {
    this.courseService.getCourse(this.courseId).subscribe({
      next: (c) => {
        this.form.setValue({
          courseCode: c.course_code,
          courseName: c.course_name,
          term: c.term,
          professor: c.professor_name ?? '',
          termEnd: c.term_end ? c.term_end.slice(0, 10) : '', // 'YYYY-MM-DD' for the date input
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this course.');
        this.loading.set(false);
      },
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.courseService.updateCourse(this.courseId, {
      courseCode: v.courseCode,
      courseName: v.courseName,
      term: v.term,
      professor: v.professor,
      termEnd: v.termEnd,
    }).subscribe({
      next: () => this.router.navigateByUrl('/courses'),
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Could not save the course.');
      },
    });
  }
}