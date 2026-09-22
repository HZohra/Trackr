import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ActivityService } from '../../../core/services/activity.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course';

@Component({
  selector: 'app-assignment-detail',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './assignment-detail.html',
  styleUrl: './assignment-detail.css',
})
export class AssignmentDetail {
  private readonly fb = inject(FormBuilder);
  private readonly activityService = inject(ActivityService);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly courses = signal<Course[]>([]);

  protected readonly categories = [
    { id: 1, name: 'Assignment' }, { id: 2, name: 'Quiz' }, { id: 3, name: 'Exam' },
    { id: 4, name: 'Project' }, { id: 5, name: 'Lab' }, { id: 6, name: 'Other' },
  ];
  protected readonly statuses = [
    { value: 'not_started', label: 'Not started' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'graded', label: 'Graded' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    courseId: [0, [Validators.required, Validators.min(1)]],
    categoryId: [1, [Validators.required]],
    name: ['', [Validators.required]],
    dueDate: [''],
    weight: [0],
    grade: [''],
    status: ['not_started'],
    instructions: [''],
    notes: [''],
  });

  constructor() {
    forkJoin({
      activities: this.activityService.getAllActivities(),
      courses: this.courseService.getCourses(),
    }).subscribe({
      next: ({ activities, courses }) => {
        this.courses.set(courses);
        const a = activities.find((x) => x.activity_id === this.id);
        if (!a) { this.error.set('Assignment not found.'); this.loading.set(false); return; }
        this.form.patchValue({
          courseId: a.course_id,
          categoryId: a.activity_category_id,
          name: a.activity_name,
          dueDate: a.due_date ? a.due_date.slice(0, 16).replace(' ', 'T') : '',
          weight: a.grading_weight != null ? Number(a.grading_weight) : 0,
          grade: a.grade != null ? String(a.grade) : '',
          status: a.status,
          instructions: a.instructions ?? '',
          notes: a.notes ?? '',
        });
        this.loading.set(false);
      },
      error: () => { this.error.set('Could not load this assignment.'); this.loading.set(false); },
    });
  }

  protected onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.activityService.updateActivity(this.id, {
      courseId: Number(v.courseId),
      categoryId: Number(v.categoryId),
      name: v.name.trim(),
      dueDate: v.dueDate ? v.dueDate : null,
      weight: Number(v.weight),
      grade: v.grade === '' ? null : Number(v.grade),
      status: v.status,
      instructions: v.instructions.trim() ? v.instructions : null,
      notes: v.notes.trim() ? v.notes : null,
    }).subscribe({
      next: () => this.router.navigateByUrl('/assignments'),
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message ?? 'Could not save.'); },
    });
  }

  protected onDelete(): void {
    if (!confirm('Delete this assignment? This cannot be undone.')) return;
    this.saving.set(true);
    this.activityService.deleteActivity(this.id).subscribe({
      next: () => this.router.navigateByUrl('/assignments'),
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message ?? 'Could not delete.'); },
    });
  }
}
