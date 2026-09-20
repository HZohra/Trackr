import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';

@Component({
  selector: 'app-add-course',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './add-course.html',
  styleUrl: './add-course.css',
})
export class AddCourse {
  private readonly fb = inject(FormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    courseCode: ['', [Validators.required]],
    courseName: ['', [Validators.required]],
    term: ['', [Validators.required]],
    professor: [''],
    termEnd: [''],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.courseService
      .createCourse({
        courseCode: v.courseCode,
        courseName: v.courseName,
        term: v.term,
        professor: v.professor,
        termEnd: v.termEnd,
      })
      .subscribe({
        next: () => this.router.navigateByUrl('/courses'),
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.errors?.[0] ?? err?.error?.message ?? 'Could not create the course.');
        },
      });
  }
}