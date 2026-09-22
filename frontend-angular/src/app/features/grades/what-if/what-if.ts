import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CourseService } from '../../../core/services/course.service';
import { ActivityService } from '../../../core/services/activity.service';
import { GpaService } from '../../../core/services/gpa.service';
import { Course, COURSE_COLORS } from '../../../core/models/course';
import { Activity } from '../../../core/models/activity';

interface WhatIfActivity { id: number; name: string; weight: number; graded: boolean; grade: number | null; }
interface WhatIfCourse { id: number; code: string; name: string; color: string; activities: WhatIfActivity[]; }

@Component({
  selector: 'app-what-if',
  imports: [RouterLink],
  templateUrl: './what-if.html',
  styleUrl: './what-if.css',
})
export class WhatIf {
  private readonly courseService = inject(CourseService);
  private readonly activityService = inject(ActivityService);
  private readonly gpaService = inject(GpaService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly courses = signal<WhatIfCourse[]>([]);
  protected readonly globalGuess = signal<number | null>(null);
  private readonly hypos = signal<Record<number, number | null>>({});

  protected readonly scale = this.gpaService.scale;
  protected readonly hasGpa = this.gpaService.hasGpa;

  constructor() {
    forkJoin({
      courses: this.courseService.getCourses(),
      activities: this.activityService.getAllActivities(),
    }).subscribe({
      next: ({ courses, activities }) => {
        const active = courses.filter((c) => !c.archived);
        this.courses.set(active.map((c) => this.build(c, activities)));
        this.loading.set(false);
      },
      error: () => { this.error.set('Could not load your grades.'); this.loading.set(false); },
    });
  }

  private build(c: Course, activities: Activity[]): WhatIfCourse {
    const acts = activities
      .filter((a) => a.course_id === c.id && a.grading_weight != null)
      .map((a) => ({
        id: a.activity_id,
        name: a.activity_name,
        weight: Number(a.grading_weight),
        graded: a.grade != null,
        grade: a.grade != null ? Number(a.grade) : null,
      }));
    return { id: c.id, code: c.code, name: c.name, color: COURSE_COLORS[c.color], activities: acts };
  }

  protected setGlobal(v: string): void { this.globalGuess.set(v === '' ? null : this.clamp(+v)); }
  protected setHypo(id: number, v: string): void {
    this.hypos.update((m) => ({ ...m, [id]: v === '' ? null : this.clamp(+v) }));
  }
  protected hypoValue(id: number): number | null { return this.hypos()[id] ?? null; }
  protected ungraded(c: WhatIfCourse): WhatIfActivity[] { return c.activities.filter((a) => !a.graded); }
  protected reset(): void { this.hypos.set({}); this.globalGuess.set(null); }

  private clamp(n: number): number { return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0; }

  private effective(a: WhatIfActivity): number | null {
    if (a.graded) return a.grade;
    const h = this.hypos()[a.id];
    if (h != null) return h;
    return this.globalGuess();
  }

  private weighted(pairs: { grade: number; weight: number }[]): number | null {
    let ws = 0, gs = 0;
    for (const p of pairs) { gs += p.grade * p.weight; ws += p.weight; }
    return ws > 0 ? gs / ws : null;
  }

  private courseGrade(c: WhatIfCourse, projected: boolean): number | null {
    const pairs = c.activities
      .map((a) => {
        const g = projected ? this.effective(a) : (a.graded ? a.grade : null);
        return g == null ? null : { grade: g, weight: a.weight };
      })
      .filter((x): x is { grade: number; weight: number } => x != null);
    const w = this.weighted(pairs);
    return w == null ? null : Math.round(w);
  }

  protected currentGrade(c: WhatIfCourse): number | null { return this.courseGrade(c, false); }
  protected projectedGrade(c: WhatIfCourse): number | null { return this.courseGrade(c, true); }

  private avg(vals: number[]): number | null {
    if (!vals.length) return null;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }

  protected readonly currentAvg = computed(() =>
    this.avg(this.courses().map((c) => this.currentGrade(c)).filter((v): v is number => v != null)));
  protected readonly projectedAvg = computed(() =>
    this.avg(this.courses().map((c) => this.projectedGrade(c)).filter((v): v is number => v != null)));

  private gpaOf(grades: number[]): string {
    const pts = grades.map((g) => this.gpaService.gradePoint(g).points).filter((p): p is number => p != null);
    if (!pts.length) return '—';
    return (pts.reduce((s, p) => s + p, 0) / pts.length).toFixed(2);
  }
  protected readonly currentGpa = computed(() =>
    this.gpaOf(this.courses().map((c) => this.currentGrade(c)).filter((v): v is number => v != null)));
  protected readonly projectedGpa = computed(() =>
    this.gpaOf(this.courses().map((c) => this.projectedGrade(c)).filter((v): v is number => v != null)));

  protected bandColor(grade: number | null): string {
    if (grade == null) return 'var(--muted)';
    if (grade >= 80) return 'var(--leaf)';
    if (grade >= 60) return 'var(--amber)';
    return 'var(--danger)';
  }
}