import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CourseService } from '../../core/services/course.service';
import { ActivityService } from '../../core/services/activity.service';
import { GpaService } from '../../core/services/gpa.service';
import { Course, COURSE_COLORS } from '../../core/models/course';
import { Activity } from '../../core/models/activity';
import { weightedGrade, percentComplete } from '../../core/grade-math';

interface GradeRow {
  id: number;
  code: string;
  name: string;
  color: string;
  grade: number | null;
  progress: number;
  letter: string;
  points: number | null;
}

@Component({
  selector: 'app-grades',
  imports: [RouterLink],
  templateUrl: './grades.html',
  styleUrl: './grades.css',
})
export class Grades {
  private readonly courseService = inject(CourseService);
  private readonly activityService = inject(ActivityService);
  private readonly gpaService = inject(GpaService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly courses = signal<Course[]>([]);
  private readonly activities = signal<Activity[]>([]);

  protected readonly scale = this.gpaService.scale;
  protected readonly hasGpa = this.gpaService.hasGpa;

  constructor() {
    forkJoin({
      courses: this.courseService.getCourses(),
      activities: this.activityService.getAllActivities(),
    }).subscribe({
      next: ({ courses, activities }) => {
        this.courses.set(courses);
        this.activities.set(activities);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your grades.');
        this.loading.set(false);
      },
    });
  }

  protected readonly rows = computed<GradeRow[]>(() =>
    this.courses().map((c) => {
      const acts = this.activities().filter((a) => a.course_id === c.id);
      const g = weightedGrade(acts);
      const grade = g == null ? null : Math.round(g);
      const gp = grade == null ? null : this.gpaService.gradePoint(grade);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        color: COURSE_COLORS[c.color],
        grade,
        progress: percentComplete(acts),
        letter: gp ? gp.letter : '—',
        points: gp ? gp.points : null,
      };
    }),
  );

  protected readonly gradedCount = computed(() => this.rows().filter((r) => r.grade != null).length);

  protected readonly termAverage = computed(() => {
    const gs = this.rows().map((r) => r.grade).filter((v): v is number => v != null);
    if (!gs.length) return null;
    return Math.round(gs.reduce((s, v) => s + v, 0) / gs.length);
  });

  protected readonly gpaLabel = computed(() => {
    const pts = this.rows().map((r) => r.points).filter((v): v is number => v != null);
    if (!pts.length) return '—';
    return (pts.reduce((s, v) => s + v, 0) / pts.length).toFixed(2);
  });

  protected bandColor(grade: number | null): string {
    if (grade == null) return 'var(--muted)';
    if (grade >= 80) return 'var(--leaf)';
    if (grade >= 60) return 'var(--amber)';
    return 'var(--danger)';
  }
}