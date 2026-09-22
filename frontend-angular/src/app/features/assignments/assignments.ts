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
}