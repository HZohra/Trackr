import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CourseService, CourseDetailRow } from '../../../core/services/course.service';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity, CATEGORY_ID_TO_NAME } from '../../../core/models/activity';
import { colorForCourse, COURSE_COLORS } from '../../../core/models/course';
import { weightedGrade, percentComplete, totalWeight } from '../../../core/grade-math';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.css',
})
export class CourseDetail {
  private readonly courseService = inject(CourseService);
  private readonly activityService = inject(ActivityService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly courseId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly course = signal<CourseDetailRow | null>(null);
  protected readonly activities = signal<Activity[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly categoryName = CATEGORY_ID_TO_NAME;
  protected readonly hex = COURSE_COLORS[colorForCourse(this.courseId)];

  protected readonly currentGrade = computed(() => {
    const c = this.course();
    const override = c?.final_grade != null ? Number(c.final_grade) : null;
    const g = override != null ? override : weightedGrade(this.activities());
    return g == null ? null : Math.round(g);
  });
  protected readonly progress = computed(() => percentComplete(this.activities()));
  protected readonly weightSum = computed(() => Math.round(totalWeight(this.activities())));

  protected readonly upcoming = computed(() =>
    this.activities()
      .filter((a) => a.grade == null)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
  );
  protected readonly completed = computed(() => this.activities().filter((a) => a.grade != null));

  constructor() {
    forkJoin({
      course: this.courseService.getCourse(this.courseId),
      activities: this.activityService.getByCourse(this.courseId),
    }).subscribe({
      next: ({ course, activities }) => {
        this.course.set(course);
        this.activities.set(activities);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this course.');
        this.loading.set(false);
      },
    });
  }

  protected isOverdue(a: Activity): boolean {
    return a.grade == null && a.due_date != null && new Date(a.due_date) < new Date();
  }

  protected toggleArchive(): void {
    const c = this.course();
    if (!c) return;
    this.busy.set(true);
    this.courseService.setArchived(this.courseId, !c.archived).subscribe({
      next: () => { this.course.set({ ...c, archived: !c.archived }); this.busy.set(false); },
      error: () => { this.busy.set(false); this.error.set('Could not update archive state.'); },
    });
  }

  protected deleteCourse(): void {
    const c = this.course();
    if (!c) return;
    if (!confirm(`Delete "${c.course_code} — ${c.course_name}" and all its assignments? This cannot be undone.`)) return;
    this.busy.set(true);
    this.courseService.deleteCourse(this.courseId).subscribe({
      next: () => this.router.navigateByUrl('/courses'),
      error: () => { this.busy.set(false); this.error.set('Could not delete the course.'); },
    });
  }
}