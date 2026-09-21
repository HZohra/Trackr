import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CourseService } from '../../core/services/course.service';
import { ActivityService } from '../../core/services/activity.service';
import { Course, COURSE_COLORS } from '../../core/models/course';
import { Activity, CATEGORY_ID_TO_NAME } from '../../core/models/activity';
import { weightedGrade, percentComplete } from '../../core/grade-math';
import { CourseCard } from '../../shared/course-card/course-card';
import { Skeleton } from '../../shared/skeleton/skeleton';

interface FocusItem {
  courseId: number; code: string; color: string;
  name: string; category: string; weight: string; due: Date; overdue: boolean;
}
interface DueItem {
  id: number; code: string; color: string; name: string;
  label: string; overdue: boolean; weight: string;
}

const DAY = 86_400_000;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CourseCard, Skeleton],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly courseService = inject(CourseService);
  private readonly activityService = inject(ActivityService);

  protected readonly courses = signal<Course[]>([]);
  protected readonly activities = signal<Activity[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly now = signal(new Date());
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    forkJoin({
      courses: this.courseService.getCourses(),
      activities: this.activityService.getAllActivities(),
    }).subscribe({
      next: ({ courses, activities }) => {
        this.activities.set(activities);
        this.courses.set(this.enrich(courses, activities));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your dashboard.');
        this.loading.set(false);
      },
    });
    this.timer = setInterval(() => this.now.set(new Date()), 60_000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected readonly firstName = computed(() => this.auth.currentUser()?.first_name ?? 'there');

  protected readonly greeting = computed(() => {
    const h = this.now().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  });

  private readonly pending = computed(() =>
    this.activities()
      .filter((a) => a.grade == null && a.due_date)
      .map((a) => ({ a, due: new Date(a.due_date as string) }))
      .sort((x, y) => x.due.getTime() - y.due.getTime()),
  );

  protected readonly overdueCount = computed(
    () => this.pending().filter((p) => p.due.getTime() < this.now().getTime()).length,
  );

  protected readonly dueThisWeekCount = computed(() => {
    const now = this.now().getTime();
    return this.pending().filter((p) => p.due.getTime() >= now && p.due.getTime() <= now + 7 * DAY).length;
  });

  protected readonly avgGrade = computed(() => {
    const grades = this.courses().map((c) => c.currentGrade).filter((g): g is number => g != null);
    if (!grades.length) return null;
    return Math.round(grades.reduce((s, g) => s + g, 0) / grades.length);
  });

  protected readonly focus = computed<FocusItem | null>(() => {
    const first = this.pending()[0];
    if (!first) return null;
    const a = first.a;
    return {
      courseId: a.course_id,
      code: this.codeOf(a.course_id),
      color: this.colorOf(a.course_id),
      name: a.activity_name,
      category: CATEGORY_ID_TO_NAME[a.activity_category_id] ?? '',
      weight: a.grading_weight != null ? `${+a.grading_weight}%` : '',
      due: first.due,
      overdue: first.due.getTime() < this.now().getTime(),
    };
  });

  protected readonly countdown = computed(() => {
    const f = this.focus();
    if (!f) return '';
    const ms = f.due.getTime() - this.now().getTime();
    if (ms <= 0) return 'Overdue';
    const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  });

  protected readonly dueSoon = computed<DueItem[]>(() => {
    const weekEnd = this.now().getTime() + 7 * DAY;
    return this.pending()
      .filter((p) => p.due.getTime() <= weekEnd)
      .slice(0, 6)
      .map(({ a, due }) => ({
        id: a.activity_id,
        code: this.codeOf(a.course_id),
        color: this.colorOf(a.course_id),
        name: a.activity_name,
        label: this.relativeLabel(due),
        overdue: due.getTime() < this.now().getTime(),
        weight: a.grading_weight != null ? `${+a.grading_weight}%` : '',
      }));
  });

  protected bandColor(grade: number | null): string {
    if (grade == null) return 'var(--muted)';
    if (grade >= 80) return 'var(--leaf)';
    if (grade >= 60) return 'var(--amber)';
    return 'var(--danger)';
  }

  private enrich(courses: Course[], activities: Activity[]): Course[] {
    return courses.map((c) => {
      const acts = activities.filter((a) => a.course_id === c.id);
      const g = weightedGrade(acts);
      return { ...c, currentGrade: g != null ? Math.round(g) : null, percentComplete: percentComplete(acts) };
    });
  }

  private codeOf(courseId: number): string {
    return this.courses().find((c) => c.id === courseId)?.code ?? '—';
  }
  private colorOf(courseId: number): string {
    const c = this.courses().find((x) => x.id === courseId);
    return c ? COURSE_COLORS[c.color] : 'var(--muted)';
  }

  private relativeLabel(due: Date): string {
    const now = this.now();
    if (due.getTime() < now.getTime()) return 'Overdue';
    const startNow = new Date(now); startNow.setHours(0, 0, 0, 0);
    const startDue = new Date(due); startDue.setHours(0, 0, 0, 0);
    const days = Math.round((startDue.getTime() - startNow.getTime()) / DAY);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}