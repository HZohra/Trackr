import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CourseService } from '../../core/services/course.service';
import { ActivityService } from '../../core/services/activity.service';
import { QuoteService, DailyQuote } from '../../core/services/quote.service';
import { Course, COURSE_COLORS } from '../../core/models/course';
import { Activity, CATEGORY_ID_TO_NAME } from '../../core/models/activity';
import { weightedGrade, percentComplete } from '../../core/grade-math';
import { rankPending } from '../../core/priority';
import { CourseCard } from '../../shared/course-card/course-card';
import { Skeleton } from '../../shared/skeleton/skeleton';

const DAY = 86_400_000;
const EXAM_CATEGORY = 3;

interface Focus {
  activityId: number; courseId: number; code: string; color: string;
  name: string; category: string; weight: string; due: Date; overdue: boolean;
}
interface Task { id: number; code: string; color: string; name: string; label: string; overdue: boolean; weight: string; }
interface ExamInfo {  activityId: number;  code: string;  name: string; weight: string; date: string; due: Date; }

@Component({
  
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, CourseCard, Skeleton],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly courseService = inject(CourseService);
  private readonly activityService = inject(ActivityService);
  private readonly quoteService = inject(QuoteService);

  private readonly allCourses = signal<Course[]>([]);
  private readonly allActivities = signal<Activity[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly now = signal(new Date());
  protected readonly flipping = signal(false);
  protected readonly marking = signal(false);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    forkJoin({
      courses: this.courseService.getCourses(),
      activities: this.activityService.getAllActivities(),
    }).subscribe({
      next: ({ courses, activities }) => {
        this.allCourses.set(courses);
        this.allActivities.set(activities);
        this.loading.set(false);
      },
      error: () => { this.error.set('Could not load your dashboard.'); this.loading.set(false); },
    });
    this.timer = setInterval(() => this.now.set(new Date()), 1_000);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  protected readonly firstName = computed(() => this.auth.currentUser()?.first_name ?? 'there');
  protected readonly today = computed(() =>
    this.now().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
  protected readonly quote = computed<DailyQuote>(() => this.quoteService.quoteOfTheDay());

  private readonly activeCourses = computed(() => this.allCourses().filter((c) => !c.archived));
  protected readonly archivedCount = computed(() => this.allCourses().filter((c) => c.archived).length);
  private readonly activeIds = computed(() => new Set(this.activeCourses().map((c) => c.id)));
  private readonly activeActivities = computed(() =>
    this.allActivities().filter((a) => this.activeIds().has(a.course_id)));
  protected readonly courses = computed(() => this.enrich(this.activeCourses(), this.activeActivities()));

  private readonly ranked = computed(() => rankPending(this.activeActivities(), this.now().getTime()));

  protected readonly overdueCount = computed(() =>
    this.ranked().filter((a) => new Date(a.due_date as string).getTime() < this.now().getTime()).length);
  protected readonly dueThisWeekCount = computed(() => {
    const now = this.now().getTime();
    return this.ranked().filter((a) => {
      const t = new Date(a.due_date as string).getTime();
      return t >= now && t <= now + 7 * DAY;
    }).length;
  });
  protected readonly avgGrade = computed(() => {
    const grades = this.courses().map((c) => c.currentGrade).filter((g): g is number => g != null);
    if (!grades.length) return null;
    return Math.round(grades.reduce((s, g) => s + g, 0) / grades.length);
  });

    // The next upcoming (open) activity name per course — for the card's "Next · …".
  protected readonly nextLabels = computed<Record<number, string>>(() => {
    const now = this.now().getTime();
    const best: Record<number, { name: string; t: number }> = {};
    for (const a of this.activeActivities()) {
      if (a.grade != null || a.status === 'submitted' || a.status === 'graded' || !a.due_date) continue;
      const t = new Date(a.due_date).getTime();
      if (Number.isNaN(t) || t < now) continue;
      if (!best[a.course_id] || t < best[a.course_id].t) best[a.course_id] = { name: a.activity_name, t };
    }
    const out: Record<number, string> = {};
    for (const id of Object.keys(best)) out[+id] = best[+id].name;
    return out;
  });

  protected readonly focus = computed<Focus | null>(() => {
    const a = this.ranked()[0];
    if (!a) return null;
    const due = new Date(a.due_date as string);
    return {
      activityId: a.activity_id, courseId: a.course_id,
      code: this.codeOf(a.course_id), color: this.colorOf(a.course_id),
      name: a.activity_name, category: CATEGORY_ID_TO_NAME[a.activity_category_id] ?? '',
      weight: a.grading_weight != null ? `${+a.grading_weight}%` : '',
      due, overdue: due.getTime() < this.now().getTime(),
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
  protected readonly focusBar = computed(() => {
    const f = this.focus();
    if (!f) return 0;
    const hoursLeft = (f.due.getTime() - this.now().getTime()) / 3_600_000;
    return Math.max(4, Math.min(100, 100 - (hoursLeft / 168) * 100));
  });

  protected readonly overdueTasks = computed<Task[]>(() =>
    this.ranked()
      .filter((a) => new Date(a.due_date as string).getTime() < this.now().getTime())
      .slice(0, 5).map((a) => this.toTask(a)));
  protected readonly thisWeek = computed<Task[]>(() => {
    const now = this.now().getTime();
    return this.ranked()
      .filter((a) => {
        const t = new Date(a.due_date as string).getTime();
        return t >= now && t <= now + 7 * DAY;
      })
      .sort((x, y) => new Date(x.due_date as string).getTime() - new Date(y.due_date as string).getTime())
      .slice(0, 6).map((a) => this.toTask(a));
  });

  protected readonly nextExam = computed<ExamInfo | null>(() => {
  const now = this.now().getTime();
  const exams = this.activeActivities()
    .filter( (a) => a.activity_category_id === EXAM_CATEGORY && a.grade == null && a.due_date)
    .map((a) => ({ a, t: new Date(a.due_date as string).getTime(), }))
    .filter((x) => !Number.isNaN(x.t) && x.t > now)
    .sort((x, y) => x.t - y.t);

  if (!exams.length) return null;

  const { a, t } = exams[0];
  const due = new Date(t);

  return {
    activityId: a.activity_id,
    code: this.codeOf(a.course_id),
    name: a.activity_name,
    weight:
      a.grading_weight != null
        ? `${+a.grading_weight}%`
        : '',
    date: due.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    due,
  };
}); 
protected readonly nextExamCountdown = computed(() => {
  const exam = this.nextExam();

  if (!exam) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
    };
  }

  const remaining = Math.max(
    0,
    exam.due.getTime() - this.now().getTime()
  );

  const totalSeconds = Math.floor(remaining / 1000);

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
});

  protected readonly semester = computed<{ cur: number; total: number } | null>(() => {
    const dues = this.activeActivities()
      .map((a) => a.due_date).filter(Boolean)
      .map((d) => new Date(d as string).getTime()).filter((t) => !Number.isNaN(t));
    if (dues.length < 2) return null;
    const start = Math.min(...dues), end = Math.max(...dues);
    const total = Math.max(1, Math.ceil((end - start) / (7 * DAY)));
    const cur = Math.min(total, Math.max(1, Math.ceil((this.now().getTime() - start) / (7 * DAY))));
    return { cur, total };
  });

  protected bandColor(grade: number | null): string {
    if (grade == null) return 'var(--muted)';
    if (grade >= 80) return 'var(--leaf)';
    if (grade >= 60) return 'var(--amber)';
    return 'var(--danger)';
  }

    protected markDone(activityId: number): void {
    if (this.marking()) return;
    this.marking.set(true);
    this.activityService.setStatus(activityId, 'submitted').subscribe({
      next: () => {
        const apply = () => {
          this.allActivities.update((list) =>
            list.map((a) => (a.activity_id === activityId ? { ...a, status: 'submitted' } : a)));
          this.marking.set(false);
        };
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
        this.flipping.set(true);
        setTimeout(() => { apply(); this.flipping.set(false); }, 260);
      },
      error: () => this.marking.set(false),
    });
  }

  protected deadlineLabel(due: Date): string {
  const now = this.now();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const target = new Date(due);
  target.setHours(0, 0, 0, 0);

  const dayDiff = Math.round(
    (target.getTime() - today.getTime()) / DAY
  );

  let prefix: string;

  if (dayDiff === 0) {
    prefix = 'Today';
  } else if (dayDiff === 1) {
    prefix = 'Tomorrow';
  } else {
    prefix = due.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  const time = due.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${prefix}, ${time}`;
}
  private enrich(courses: Course[], activities: Activity[]): Course[] {
    return courses.map((c) => {
      const acts = activities.filter((a) => a.course_id === c.id);
      const g = weightedGrade(acts);
      return { ...c, currentGrade: g != null ? Math.round(g) : null, percentComplete: percentComplete(acts) };
    });
  }
  private toTask(a: Activity): Task {
    const due = new Date(a.due_date as string);
    return {
      id: a.activity_id, code: this.codeOf(a.course_id), color: this.colorOf(a.course_id),
      name: a.activity_name, label: this.relativeLabel(due),
      overdue: due.getTime() < this.now().getTime(),
      weight: a.grading_weight != null ? `${+a.grading_weight}%` : '',
    };
  }
  private codeOf(courseId: number): string {
    return this.activeCourses().find((c) => c.id === courseId)?.code ?? '—';
  }
  private colorOf(courseId: number): string {
    const c = this.activeCourses().find((x) => x.id === courseId);
    return c ? COURSE_COLORS[c.color] : 'var(--muted)';
  }

  
  private relativeLabel(due: Date): string {
  const now = this.now();

  if (due.getTime() < now.getTime()) {
    const daysLate = Math.max(
      1,
      Math.ceil(
        (now.getTime() - due.getTime()) / DAY
      )
    );

    return `${daysLate}d late`;
  }

  const startNow = new Date(now);
  startNow.setHours(0, 0, 0, 0);

  const startDue = new Date(due);
  startDue.setHours(0, 0, 0, 0);

  const days = Math.round(
    (startDue.getTime() - startNow.getTime()) / DAY
  );

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';

  return due.toLocaleDateString(undefined, {
    weekday: 'short',
  });
}


}
