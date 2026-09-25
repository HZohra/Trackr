import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CourseService } from '../../core/services/course.service';
import { ActivityService } from '../../core/services/activity.service';
import { GpaService } from '../../core/services/gpa.service';
import { SnoozeService } from '../../core/services/snooze.service';
import { Course, COURSE_COLORS } from '../../core/models/course';
import { Activity, CATEGORY_ID_TO_NAME } from '../../core/models/activity';
import { weightedGrade, percentComplete } from '../../core/grade-math';
import { courseHealth, CourseHealth } from '../../core/course-health';
import { rankPending, priorityReason } from '../../core/priority';
import { CourseCard } from '../../shared/course-card/course-card';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { WorkloadStrip, WorkloadDay } from '../../shared/workload-strip/workload-strip';

const DAY = 86_400_000;
const EXAM_CATEGORY = 3;
/** How many ranked items the "next move" stack lets you flip through. */
const STACK_SIZE = 3;
/** Past-due items older than this are faded and offer "Dismiss". */
const STALE_AFTER_DAYS = 7;
/** Re-render cadence. Nothing on the page shows seconds any more. */
const TICK_MS = 30_000;

const REASON_LABEL = {
  'overdue': 'Overdue',
  'due-soonest': 'Due soonest',
  'highest-impact': 'Highest impact',
} as const;

interface Focus {
  activityId: number; code: string; color: string;
  name: string; category: string; weight: string; due: Date; overdue: boolean;
  reason: string;
}
interface PastDue { id: number; code: string; color: string; name: string; weight: string; label: string; stale: boolean; }
interface ExamInfo { activityId: number; code: string; name: string; weight: string; date: string; days: number; }

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CourseCard, Skeleton, WorkloadStrip],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  private readonly courseService = inject(CourseService);
  private readonly activityService = inject(ActivityService);
  private readonly gpa = inject(GpaService);
  private readonly snoozes = inject(SnoozeService);

  private readonly allCourses = signal<Course[]>([]);
  private readonly allActivities = signal<Activity[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly now = signal(new Date());
  protected readonly flipping = signal(false);
  protected readonly marking = signal(false);
  /** Which card of the next-move stack is on top. */
  protected readonly stackIndex = signal(0);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.load();
    this.timer = setInterval(() => this.now.set(new Date()), TICK_MS);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      courses: this.courseService.getCourses(),
      activities: this.activityService.getAllActivities(),
    }).subscribe({
      next: ({ courses, activities }) => {
        this.allCourses.set(courses);
        this.allActivities.set(activities);
        this.loading.set(false);
      },
      error: () => { this.error.set("Your dashboard didn't load."); this.loading.set(false); },
    });
  }

  // ---------------------------------------------------------------- courses

  private readonly activeCourses = computed(() => this.allCourses().filter((c) => !c.archived));
  protected readonly archivedCount = computed(() => this.allCourses().filter((c) => c.archived).length);
  private readonly activeIds = computed(() => new Set(this.activeCourses().map((c) => c.id)));
  private readonly activeActivities = computed(() =>
    this.allActivities().filter((a) => this.activeIds().has(a.course_id)));
  private readonly byCourse = computed(() => {
    const m = new Map<number, Activity[]>();
    for (const a of this.activeActivities()) m.set(a.course_id, [...(m.get(a.course_id) ?? []), a]);
    return m;
  });
  protected readonly courses = computed(() =>
    this.activeCourses().map((c) => {
      const acts = this.byCourse().get(c.id) ?? [];
      const g = weightedGrade(acts);
      return { ...c, currentGrade: g != null ? Math.round(g) : null, percentComplete: percentComplete(acts) };
    }));
  protected readonly health = computed<Record<number, CourseHealth>>(() => {
    const out: Record<number, CourseHealth> = {};
    for (const c of this.activeCourses()) out[c.id] = courseHealth(this.byCourse().get(c.id) ?? [], this.gpa.scale());
    return out;
  });

  // ---------------------------------------------------------------- ranking

  private readonly ranked = computed(() => rankPending(this.activeActivities(), this.now().getTime()));
  /** Ranked, minus anything snoozed or dismissed. */
  private readonly queue = computed(() => {
    this.snoozes.version(); // re-run when snoozes change
    const now = this.now().getTime();
    return this.ranked().filter((a) => !this.snoozes.isHidden(a.activity_id, now));
  });
  protected readonly stackCount = computed(() => Math.min(STACK_SIZE, this.queue().length));

  protected readonly focus = computed<Focus | null>(() => {
    const queue = this.queue();
    const a = queue[Math.min(this.stackIndex(), Math.max(0, this.stackCount() - 1))];
    if (!a) return null;
    const now = this.now().getTime();
    const due = new Date(a.due_date as string);
    return {
      activityId: a.activity_id,
      code: this.codeOf(a.course_id), color: this.colorOf(a.course_id),
      name: a.activity_name, category: CATEGORY_ID_TO_NAME[a.activity_category_id] ?? '',
      weight: a.grading_weight != null ? `${+a.grading_weight}%` : '',
      due, overdue: due.getTime() < now,
      reason: REASON_LABEL[priorityReason(a, queue, now)],
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
    return Math.round(Math.max(4, Math.min(100, 100 - (hoursLeft / 168) * 100)));
  });

  // ---------------------------------------------------------------- this week

  protected readonly week = computed<WorkloadDay[]>(() => {
    const start = new Date(this.now());
    start.setHours(0, 0, 0, 0);
    const days: WorkloadDay[] = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(start.getTime() + i * DAY), isToday: i === 0, items: [],
    }));
    const now = this.now().getTime();
    for (const a of this.ranked()) {
      const t = new Date(a.due_date as string).getTime();
      if (t < now) continue;
      const idx = Math.floor((t - start.getTime()) / DAY);
      if (idx < 0 || idx > 6) continue;
      days[idx].items.push({
        id: a.activity_id, name: a.activity_name,
        code: this.codeOf(a.course_id), color: this.colorOf(a.course_id),
        weight: Number(a.grading_weight) || 0,
      });
    }
    for (const d of days) d.items.sort((x, y) => y.weight - x.weight);
    return days;
  });
  protected readonly weekIsEmpty = computed(() => this.week().every((d) => !d.items.length));

  /** The single course with the most weight due this week — comparable, unlike a cross-course sum. */
  protected readonly heaviestThisWeek = computed(() => {
    const perCourse = new Map<string, number>();
    for (const d of this.week()) for (const it of d.items) perCourse.set(it.code, (perCourse.get(it.code) ?? 0) + it.weight);
    let best: { code: string; weight: number } | null = null;
    for (const [code, weight] of perCourse) if (weight > 0 && (!best || weight > best.weight)) best = { code, weight };
    return best;
  });

  // ---------------------------------------------------------------- rail

  protected readonly avgGrade = computed(() => {
    const grades = this.courses().map((c) => c.currentGrade).filter((g): g is number => g != null);
    if (!grades.length) return null;
    return Math.round(grades.reduce((s, g) => s + g, 0) / grades.length);
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

  protected readonly nextExam = computed<ExamInfo | null>(() => {
    const now = this.now().getTime();
    const next = this.activeActivities()
      .filter((a) => a.activity_category_id === EXAM_CATEGORY && a.grade == null && a.due_date)
      .map((a) => ({ a, t: new Date(a.due_date as string).getTime() }))
      .filter((x) => !Number.isNaN(x.t) && x.t > now)
      .sort((x, y) => x.t - y.t)[0];
    if (!next) return null;
    const due = new Date(next.t);
    const today = new Date(this.now()); today.setHours(0, 0, 0, 0);
    const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
    return {
      activityId: next.a.activity_id,
      code: this.codeOf(next.a.course_id),
      name: next.a.activity_name,
      weight: next.a.grading_weight != null ? `${+next.a.grading_weight}%` : '',
      date: due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      days: Math.round((dueDay.getTime() - today.getTime()) / DAY),
    };
  });

  protected readonly pastDue = computed<PastDue[]>(() => {
    const now = this.now().getTime();
    return this.queue()
      .filter((a) => new Date(a.due_date as string).getTime() < now)
      .sort((x, y) => new Date(y.due_date as string).getTime() - new Date(x.due_date as string).getTime())
      .slice(0, 5)
      .map((a) => {
        const daysLate = Math.max(1, Math.floor((now - new Date(a.due_date as string).getTime()) / DAY));
        return {
          id: a.activity_id, code: this.codeOf(a.course_id), color: this.colorOf(a.course_id),
          name: a.activity_name,
          weight: a.grading_weight != null ? `${+a.grading_weight}%` : '',
          label: `${daysLate}d late`, stale: daysLate > STALE_AFTER_DAYS,
        };
      });
  });
  protected readonly pastDueCount = computed(() => {
    const now = this.now().getTime();
    return this.queue().filter((a) => new Date(a.due_date as string).getTime() < now).length;
  });

  protected readonly nextLabels = computed<Record<number, string>>(() => {
    const now = this.now().getTime();
    const out: Record<number, string> = {};
    const bestT: Record<number, number> = {};
    for (const a of this.ranked()) {
      const t = new Date(a.due_date as string).getTime();
      if (t < now) continue;
      if (bestT[a.course_id] == null || t < bestT[a.course_id]) { bestT[a.course_id] = t; out[a.course_id] = a.activity_name; }
    }
    return out;
  });

  // ---------------------------------------------------------------- actions

  protected nextCard(): void {
    const n = this.stackCount();
    if (n > 1) this.animate(() => this.stackIndex.update((i) => (i + 1) % n));
  }

  protected snooze(activityId: number): void {
    this.animate(() => { this.snoozes.snooze(activityId); this.clampStack(); });
  }

  protected dismiss(activityId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.snoozes.dismiss(activityId);
  }

  protected markDone(activityId: number): void {
    if (this.marking()) return;
    this.marking.set(true);
    this.activityService.setStatus(activityId, 'submitted').subscribe({
      next: () => this.animate(() => {
        this.allActivities.update((list) =>
          list.map((a) => (a.activity_id === activityId ? { ...a, status: 'submitted' } : a)));
        this.clampStack();
        this.marking.set(false);
      }),
      error: () => this.marking.set(false),
    });
  }

  /** Runs `apply` behind the card-flip animation (instantly with reduced motion). */
  private animate(apply: () => void): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
    this.flipping.set(true);
    setTimeout(() => { apply(); this.flipping.set(false); }, 260);
  }

  private clampStack(): void {
    const n = this.stackCount();
    if (this.stackIndex() >= n) this.stackIndex.set(Math.max(0, n - 1));
  }

  // ---------------------------------------------------------------- helpers

  protected bandColor(grade: number | null): string {
    if (grade == null) return 'var(--muted)';
    if (grade >= 80) return 'var(--leaf)';
    if (grade >= 60) return 'var(--amber)';
    return 'var(--danger)';
  }

  protected deadlineLabel(due: Date): string {
    const today = new Date(this.now()); today.setHours(0, 0, 0, 0);
    const target = new Date(due); target.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((target.getTime() - today.getTime()) / DAY);
    const prefix = dayDiff === 0 ? 'Today'
      : dayDiff === 1 ? 'Tomorrow'
      : due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return `${prefix}, ${due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  private codeOf(courseId: number): string {
    return this.activeCourses().find((c) => c.id === courseId)?.code ?? '—';
  }
  private colorOf(courseId: number): string {
    const c = this.activeCourses().find((x) => x.id === courseId);
    return c ? COURSE_COLORS[c.color] : 'var(--muted)';
  }
}