import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ActivityService } from '../../core/services/activity.service';
import { CourseService } from '../../core/services/course.service';
import { Activity, CATEGORY_ID_TO_NAME } from '../../core/models/activity';

type Filter = 'all' | 'upcoming' | 'overdue' | 'completed';

@Component({
  selector: 'app-assignments',
  imports: [RouterLink, DatePipe],
  templateUrl: './assignments.html',
  styleUrl: './assignments.css',
})
export class Assignments {
  private readonly activityService = inject(ActivityService);
  private readonly courseService = inject(CourseService);

  protected readonly activities = signal<Activity[]>([]);
  protected readonly courseCodes = signal<Record<number, string>>({});
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<Filter>('all');

  protected readonly filters: Filter[] = ['all', 'upcoming', 'overdue', 'completed'];
  protected readonly categoryName = CATEGORY_ID_TO_NAME;

  // Edit-modal state
  protected readonly editing = signal<Activity | null>(null);
  protected readonly editError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly visible = computed(() => {
    const now = new Date();
    return this.activities().filter((a) => {
      const graded = a.grade != null;
      const due = a.due_date ? new Date(a.due_date) : null;
      switch (this.filter()) {
        case 'completed': return graded;
        case 'upcoming':  return !graded && due != null && due >= now;
        case 'overdue':   return !graded && due != null && due < now;
        default:          return true;
      }
    });
  });

  constructor() {
    forkJoin({
      activities: this.activityService.getAllActivities(),
      courses: this.courseService.getCourses(),
    }).subscribe({
      next: ({ activities, courses }) => {
        this.activities.set(activities);
        const map: Record<number, string> = {};
        for (const c of courses) map[c.id] = c.code;
        this.courseCodes.set(map);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your assignments.');
        this.loading.set(false);
      },
    });
  }

  protected setFilter(f: Filter): void { this.filter.set(f); }
  protected courseCode(courseId: number): string { return this.courseCodes()[courseId] ?? '—'; }

  protected openEdit(a: Activity): void { this.editError.set(null); this.editing.set(a); }
  protected closeEdit(): void { this.editing.set(null); }

  protected save(a: Activity, gradeRaw: string, status: string): void {
    this.editError.set(null);
    this.saving.set(true);
    const grade = gradeRaw.trim() === '' ? null : Number(gradeRaw);
    this.activityService.updateActivity(a.activity_id, grade, status).subscribe({
      next: (updated) => {
        this.activities.update((list) => list.map((x) => (x.activity_id === updated.activity_id ? updated : x)));
        this.saving.set(false);
        this.closeEdit();
      },
      error: (err) => {
        this.saving.set(false);
        this.editError.set(err?.error?.message ?? 'Could not save.');
      },
    });
  }

  protected remove(a: Activity): void {
    if (!confirm(`Delete "${a.activity_name}"?`)) return;
    this.saving.set(true);
    this.activityService.deleteActivity(a.activity_id).subscribe({
      next: () => {
        this.activities.update((list) => list.filter((x) => x.activity_id !== a.activity_id));
        this.saving.set(false);
        this.closeEdit();
      },
      error: (err) => {
        this.saving.set(false);
        this.editError.set(err?.error?.message ?? 'Could not delete.');
      },
    });
  }
}