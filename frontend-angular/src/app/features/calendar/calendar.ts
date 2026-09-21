import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ActivityService } from '../../core/services/activity.service';
import { CourseService } from '../../core/services/course.service';
import { CalendarEventService } from '../../core/services/calendar-event.service';
import { Activity, CATEGORY_ID_TO_NAME } from '../../core/models/activity';
import { Course, COURSE_COLORS } from '../../core/models/course';

type View = 'month' | 'week';

interface DayItem {
  uid: string;
  kind: 'activity' | 'event';
  refId: number | string;
  courseId: number | null;
  name: string;
  typeLabel: string;
  color: string;
  date: Date;
  time: string | null;
  graded: boolean;
  overdue: boolean;
}
interface DayCell {
  key: string;
  day: number;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  items: DayItem[];
}
interface WeekDay { label: string; day: number; count: number; isToday: boolean; }
interface Filters { assignments: boolean; other: boolean; completed: boolean; }

const TASK_TYPES: { value: string; label: string; categoryId: number | null }[] = [
  { value: 'assignment', label: 'Assignment', categoryId: 1 },
  { value: 'quiz', label: 'Quiz', categoryId: 2 },
  { value: 'exam', label: 'Exam', categoryId: 3 },
  { value: 'project', label: 'Project', categoryId: 4 },
  { value: 'lab', label: 'Lab', categoryId: 5 },
  { value: 'other', label: 'Other', categoryId: null },
];

@Component({
  selector: 'app-calendar',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly activityService = inject(ActivityService);
  private readonly courseService = inject(CourseService);
  private readonly calendarEvents = inject(CalendarEventService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly courses = signal<Course[]>([]);
  private readonly activities = signal<Activity[]>([]);
  protected readonly events = this.calendarEvents.events;

  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly taskTypes = TASK_TYPES;
  protected readonly view = signal<View>('month');
  protected readonly cursor = signal<Date>(new Date()); // a date within the viewed period
  protected readonly filters = signal<Filters>({ assignments: true, other: true, completed: true });

  // Day panel + add form
  protected readonly selected = signal<Date | null>(null);
  protected readonly saving = signal(false);
  protected readonly addError = signal<string | null>(null);
  protected readonly addForm = this.fb.nonNullable.group({
    type: ['assignment'],
    title: ['', [Validators.required]],
    courseId: [0],
    weight: [0],
    time: [''],
  });

  constructor() {
    forkJoin({
      activities: this.activityService.getAllActivities(),
      courses: this.courseService.getCourses(),
    }).subscribe({
      next: ({ activities, courses }) => {
        this.activities.set(activities);
        this.courses.set(courses);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your calendar.');
        this.loading.set(false);
      },
    });
  }

  private readonly monthAnchor = computed(() => this.firstOfMonth(this.cursor()));
  private readonly weekStart = computed(() => {
    const c = this.cursor();
    const s = new Date(c);
    s.setDate(c.getDate() - c.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  });

  protected readonly periodLabel = computed(() => {
    if (this.view() === 'month') {
      return this.monthAnchor().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    const s = this.weekStart();
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    const left = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const right = e.toLocaleDateString(undefined, s.getMonth() === e.getMonth() ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
    return `${left} – ${right}, ${e.getFullYear()}`;
  });

  private readonly allItems = computed<DayItem[]>(() => {
    const now = new Date();
    const out: DayItem[] = [];
    for (const a of this.activities()) {
      if (!a.due_date) continue;
      const d = new Date(a.due_date);
      if (Number.isNaN(d.getTime())) continue;
      const graded = a.grade != null;
      out.push({
        uid: `a${a.activity_id}`, kind: 'activity', refId: a.activity_id, courseId: a.course_id,
        name: a.activity_name, typeLabel: CATEGORY_ID_TO_NAME[a.activity_category_id] ?? '',
        color: this.colorOf(a.course_id), date: d, time: this.timeOf(d),
        graded, overdue: !graded && d.getTime() < now.getTime(),
      });
    }
    for (const e of this.events()) {
      const d = new Date(e.date + 'T00:00:00');
      if (Number.isNaN(d.getTime())) continue;
      out.push({
        uid: `e${e.id}`, kind: 'event', refId: e.id, courseId: null,
        name: e.title, typeLabel: 'Other', color: 'var(--muted)', date: d, time: e.time,
        graded: false, overdue: false,
      });
    }
    return out;
  });

  private passesFilter(i: DayItem): boolean {
    const f = this.filters();
    if (i.kind === 'activity' && !f.assignments) return false;
    if (i.kind === 'event' && !f.other) return false;
    if (i.graded && !f.completed) return false;
    return true;
  }

  private readonly itemsByDay = computed(() => this.bucket(this.allItems()));
  private readonly visibleByDay = computed(() => this.bucket(this.allItems().filter((i) => this.passesFilter(i))));

  private bucket(items: DayItem[]): Map<string, DayItem[]> {
    const map = new Map<string, DayItem[]>();
    for (const i of items) {
      const k = this.dateKey(i.date);
      const list = map.get(k);
      if (list) list.push(i);
      else map.set(k, [i]);
    }
    return map;
  }

  protected readonly weeks = computed<DayCell[][]>(() => {
    const first = this.monthAnchor();
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const today = new Date();
    const byDay = this.visibleByDay();

    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = this.dateKey(date);
      cells.push({
        key, day: date.getDate(), date,
        inMonth: date.getMonth() === first.getMonth(),
        isToday: this.sameDay(date, today),
        items: byDay.get(key) ?? [],
      });
    }
    const weeks: DayCell[][] = [];
    for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  });

  protected readonly weekDays = computed<DayCell[]>(() => {
    const start = this.weekStart();
    const today = new Date();
    const byDay = this.visibleByDay();
    const days: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = this.dateKey(date);
      days.push({
        key, day: date.getDate(), date, inMonth: true,
        isToday: this.sameDay(date, today),
        items: byDay.get(key) ?? [],
      });
    }
    return days;
  });

  protected readonly selectedItems = computed<DayItem[]>(() => {
    const d = this.selected();
    if (!d) return [];
    const items = this.itemsByDay().get(this.dateKey(d)) ?? [];
    return [...items].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
  });

  protected readonly selectedLabel = computed(() => {
    const d = this.selected();
    return d ? d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  });

  protected readonly upcoming = computed<DayItem[]>(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.allItems()
      .filter((i) => this.passesFilter(i) && i.date.getTime() >= start.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  });

  protected readonly thisWeek = computed<WeekDay[]>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    start.setHours(0, 0, 0, 0);
    const vis = this.visibleByDay();
    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ label: this.weekdays[i], day: d.getDate(), count: (vis.get(this.dateKey(d)) ?? []).length, isToday: this.sameDay(d, today) });
    }
    return days;
  });

  // --- navigation / view / filters ----------------------------------------
  protected setView(v: View): void { this.view.set(v); }
  protected prev(): void {
    const c = this.cursor();
    if (this.view() === 'month') this.cursor.set(new Date(c.getFullYear(), c.getMonth() - 1, 1));
    else { const d = new Date(c); d.setDate(c.getDate() - 7); this.cursor.set(d); }
  }
  protected next(): void {
    const c = this.cursor();
    if (this.view() === 'month') this.cursor.set(new Date(c.getFullYear(), c.getMonth() + 1, 1));
    else { const d = new Date(c); d.setDate(c.getDate() + 7); this.cursor.set(d); }
  }
  protected goToday(): void { this.cursor.set(new Date()); }
  protected toggleFilter(key: keyof Filters): void { this.filters.update((f) => ({ ...f, [key]: !f[key] })); }

  // --- day panel -----------------------------------------------------------
  protected openDate(d: Date): void {
    this.selected.set(d);
    this.addError.set(null);
    this.resetAdd();
  }
  protected closeDay(): void { this.selected.set(null); }

  protected courseCode(courseId: number | null): string {
    if (courseId == null) return '';
    return this.courses().find((c) => c.id === courseId)?.code ?? '';
  }
  protected dateLabel(d: Date): string {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  protected submitAdd(): void {
    const d = this.selected();
    if (!d) return;
    const v = this.addForm.getRawValue();
    const title = v.title.trim();
    if (!title) { this.addForm.controls.title.markAsTouched(); return; }

    const chosen = TASK_TYPES.find((t) => t.value === v.type) ?? TASK_TYPES[0];
    this.addError.set(null);
    const dateStr = this.fmtDate(d);

    if (chosen.categoryId != null) {
      if (Number(v.courseId) < 1) { this.addError.set('Pick a course for this item.'); return; }
      this.saving.set(true);
      this.activityService.addActivity({
        courseId: Number(v.courseId), categoryId: chosen.categoryId, name: title,
        dueDate: `${dateStr} ${v.time || '23:59'}`, weight: Number(v.weight),
      }).subscribe({
        next: () => this.reloadActivities(() => { this.saving.set(false); this.resetAdd(); }),
        error: (err) => {
          this.saving.set(false);
          this.addError.set(err?.error?.errors?.[0] ?? err?.error?.message ?? 'Could not add this item.');
        },
      });
    } else {
      this.calendarEvents.add({ title, date: dateStr, time: v.time || null });
      this.resetAdd();
    }
  }

  protected removeEvent(id: string): void { this.calendarEvents.remove(id); }

  private reloadActivities(done: () => void): void {
    this.activityService.getAllActivities().subscribe({
      next: (a) => { this.activities.set(a); done(); },
      error: () => done(),
    });
  }
  private resetAdd(): void {
    this.addForm.reset({ type: 'assignment', title: '', courseId: 0, weight: 0, time: '' });
  }

  // --- helpers -------------------------------------------------------------
  private firstOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
  private dateKey(d: Date): string { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
  private fmtDate(d: Date): string { return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`; }
  private timeOf(d: Date): string { return `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`; }
  private pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  private colorOf(courseId: number): string {
    const c = this.courses().find((x) => x.id === courseId);
    return c ? COURSE_COLORS[c.color] : 'var(--muted)';
  }
}