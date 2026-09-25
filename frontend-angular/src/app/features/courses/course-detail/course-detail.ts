import { Component, computed, DestroyRef, inject, signal,} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY,  Subject,  catchError,  debounceTime,  forkJoin,  switchMap,  tap,} from 'rxjs';
import { takeUntilDestroyed,} from '@angular/core/rxjs-interop';
import { CourseService,  CourseDetailRow,} from '../../../core/services/course.service';
import { ActivityService,} from '../../../core/services/activity.service';
import { Activity, CATEGORY_ID_TO_NAME,} from '../../../core/models/activity';
import { colorForCourse,  COURSE_COLORS,} from '../../../core/models/course';
import { weightedGrade,  percentComplete,  totalWeight,} from '../../../core/grade-math';

type CourseTab =
  | 'overview'
  | 'assignments'
  | 'grades'
  | 'info';

type AssignmentFilter =
  | 'all'
  | 'upcoming'
  | 'overdue'
  | 'completed';

type GoalSaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error';

interface Projection {
  kind:
    | 'need'
    | 'secured'
    | 'impossible'
    | 'final'
    | 'noweights';

  needed?: number;
  minGuaranteed?: number;
  maxReachable?: number;
  finalPct?: number;
  remainingWeight?: number;
}

@Component({
  selector: 'app-course-detail',
  imports: [
    RouterLink,
    DatePipe,
  ],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.css',
})
export class CourseDetail {
  private readonly courseService =
    inject(CourseService);

  private readonly activityService =
    inject(ActivityService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly destroyRef =
    inject(DestroyRef);

  protected readonly courseId =
    Number(
      this.route.snapshot.paramMap.get('id'),
    );

  /* =========================================================
     DATA
     ========================================================= */

  protected readonly course =
    signal<CourseDetailRow | null>(null);

  protected readonly activities =
    signal<Activity[]>([]);

  protected readonly loading =
    signal(true);

  protected readonly error =
    signal<string | null>(null);

  protected readonly busy =
    signal(false);

  protected readonly actionMenuOpen =
    signal(false);

  /* =========================================================
     NAVIGATION
     ========================================================= */

  protected readonly selectedTab =
    signal<CourseTab>('overview');

  protected readonly assignmentFilter =
    signal<AssignmentFilter>('all');

  protected readonly assignmentSearch =
    signal('');

  /* =========================================================
     CONSTANTS
     ========================================================= */

  protected readonly categoryName =
    CATEGORY_ID_TO_NAME;

  protected readonly hex =
    COURSE_COLORS[
      colorForCourse(this.courseId)
    ];

  /* =========================================================
     GRADE + PROGRESS
     ========================================================= */

  protected readonly currentGrade =
    computed(() => {
      const course = this.course();

      const override =
        course?.final_grade != null
          ? Number(course.final_grade)
          : null;

      const calculated =
        override != null
          ? override
          : weightedGrade(
              this.activities(),
            );

      return calculated == null
        ? null
        : Math.round(calculated);
    });

  protected readonly progress =
    computed(() =>
      percentComplete(
        this.activities(),
      ),
    );

  protected readonly weightSum =
    computed(() =>
      Math.round(
        totalWeight(
          this.activities(),
        ),
      ),
    );

  /* =========================================================
     ACTIVITY COUNTS
     ========================================================= */

  protected readonly completedCount =
    computed(() =>
      this.activities().filter(
        (activity) =>
          activity.grade != null ||
          activity.status === 'graded',
      ).length,
    );

  protected readonly overdueCount =
    computed(() =>
      this.activities().filter(
        (activity) =>
          this.isOverdue(activity),
      ).length,
    );

  protected readonly upcomingCount =
    computed(() =>
      this.activities().filter(
        (activity) =>
          !this.isCompleted(activity) &&
          !this.isOverdue(activity),
      ).length,
    );

  /* =========================================================
     ASSIGNMENTS
     ========================================================= */

  protected readonly upcoming =
    computed(() =>
      this.activities()
        .filter(
          (activity) =>
            !this.isCompleted(activity),
        )
        .sort(
          (a, b) =>
            this.activitySortValue(a) -
            this.activitySortValue(b),
        ),
    );

  protected readonly completed =
    computed(() =>
      this.activities().filter(
        (activity) =>
          this.isCompleted(activity),
      ),
    );

  protected readonly nextActivity =
    computed(() => {
      const now = Date.now();

      const dated =
        this.activities()
          .filter(
            (activity) =>
              !this.isCompleted(activity) &&
              activity.due_date != null &&
              new Date(
                activity.due_date,
              ).getTime() >= now,
          )
          .sort(
            (a, b) =>
              new Date(
                a.due_date!,
              ).getTime() -
              new Date(
                b.due_date!,
              ).getTime(),
          );

      if (dated.length > 0) {
        return dated[0];
      }

      return (
        this.activities().find(
          (activity) =>
            !this.isCompleted(activity),
        ) ?? null
      );
    });

  protected readonly overviewUpcoming =
    computed(() =>
      this.upcoming().slice(0, 4),
    );

  protected readonly filteredActivities =
    computed(() => {
      const query =
        this.assignmentSearch()
          .trim()
          .toLowerCase();

      let activities =
        [...this.activities()];

      switch (
        this.assignmentFilter()
      ) {
        case 'upcoming':
          activities =
            activities.filter(
              (activity) =>
                !this.isCompleted(
                  activity,
                ) &&
                !this.isOverdue(
                  activity,
                ),
            );
          break;

        case 'overdue':
          activities =
            activities.filter(
              (activity) =>
                this.isOverdue(
                  activity,
                ),
            );
          break;

        case 'completed':
          activities =
            activities.filter(
              (activity) =>
                this.isCompleted(
                  activity,
                ),
            );
          break;

        default:
          break;
      }

      if (query) {
        activities =
          activities.filter(
            (activity) => {
              const category =
                this.categoryName[
                  activity
                    .activity_category_id
                ] ?? '';

              return [
                activity.activity_name,
                category,
                activity.status,
              ]
                .join(' ')
                .toLowerCase()
                .includes(query);
            },
          );
      }

      return activities.sort(
        (a, b) =>
          this.activitySortValue(a) -
          this.activitySortValue(b),
      );
    });

  /* =========================================================
     GRADE PROJECTOR
     ========================================================= */

  protected readonly presets = [
    70,
    80,
    85,
    90,
  ];

  protected readonly target =
    signal(80);

  protected readonly goalSaveStatus =
    signal<GoalSaveStatus>('idle');

  private readonly goalChanges =
    new Subject<number>();

  protected setTarget(
    value: number,
  ): void {
    if (
      !Number.isFinite(value)
    ) {
      return;
    }

    const normalized =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(value),
        ),
      );

    this.target.set(
      normalized,
    );

    /*
    * Update the projector immediately,
    * then save after typing stops.
    */
    this.goalSaveStatus.set(
      'idle',
    );

    this.goalChanges.next(
      normalized,
    );
  }

  protected onTargetInput(
    value: string,
  ): void {
    /*
    * Don't turn an empty input into 0
    * while the user is editing.
    */
    if (!value.trim()) {
      return;
    }

    this.setTarget(
      Number(value),
    );
  }

  protected retryGoalSave(): void {
    this.goalSaveStatus.set(
      'idle',
    );

    this.goalChanges.next(
      this.target(),
    );
  }

  protected readonly projection =
    computed<Projection>(() => {
      const weight = (
        activity: Activity,
      ) =>
        activity.grading_weight != null
          ? Number(
              activity.grading_weight,
            )
          : 0;

      const activities =
        this.activities();

      const graded =
        activities.filter(
          (activity) =>
            activity.grade != null,
        );

      const remaining =
        activities.filter(
          (activity) =>
            activity.grade == null &&
            weight(activity) > 0,
        );

      const total =
        activities.reduce(
          (sum, activity) =>
            sum + weight(activity),
          0,
        );

      const remainingWeight =
        remaining.reduce(
          (sum, activity) =>
            sum + weight(activity),
          0,
        );

      const earnedPoints =
        graded.reduce(
          (sum, activity) =>
            sum +
            (Number(
              activity.grade,
            ) /
              100) *
              weight(activity),
          0,
        );

      if (total <= 0) {
        return {
          kind: 'noweights',
        };
      }

      if (
        remainingWeight <= 0
      ) {
        return {
          kind: 'final',
          finalPct:
            Math.round(
              (earnedPoints /
                total) *
                100,
            ),
        };
      }

      const targetPoints =
        (this.target() / 100) *
        total;

      const needed =
        ((targetPoints -
          earnedPoints) /
          remainingWeight) *
        100;

      const roundedRemaining =
        Math.round(
          remainingWeight,
        );

      if (needed <= 0) {
        return {
          kind: 'secured',
          minGuaranteed:
            Math.round(
              (earnedPoints /
                total) *
                100,
            ),
          remainingWeight:
            roundedRemaining,
        };
      }

      if (needed > 100) {
        return {
          kind: 'impossible',
          maxReachable:
            Math.round(
              ((earnedPoints +
                remainingWeight) /
                total) *
                100,
            ),
          remainingWeight:
            roundedRemaining,
        };
      }

      return {
        kind: 'need',
        needed:
          Math.round(
            needed * 10,
          ) / 10,
        remainingWeight:
          roundedRemaining,
      };
    });

  protected neededColor(
    value: number | undefined,
  ): string {
    if (value == null) {
      return 'var(--ink)';
    }

    if (value <= 75) {
      return 'var(--leaf)';
    }

    if (value <= 90) {
      return 'var(--amber)';
    }

    return 'var(--danger)';
  }

  /* =========================================================
     LOAD
     ========================================================= */

  constructor() {
    /*
    * Auto-save the grade goal.
    *
    * Typing updates the projector immediately,
    * but the API request waits until the user
    * has stopped changing the value for 650ms.
    */
    this.goalChanges
      .pipe(
        debounceTime(650),

        tap(() => {
          this.goalSaveStatus.set(
            'saving',
          );
        }),

        switchMap((goal) =>
          this.courseService
            .setGpaGoal(
              this.courseId,
              goal,
            )
            .pipe(
              tap(() => {
                const currentCourse =
                  this.course();

                if (currentCourse) {
                  this.course.set({
                    ...currentCourse,
                    gpa_goal:
                      String(goal),
                  });
                }

                this.goalSaveStatus.set(
                  'saved',
                );
              }),

              catchError(() => {
                this.goalSaveStatus.set(
                  'error',
                );

                return EMPTY;
              }),
            ),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe();

    forkJoin({
      course:
        this.courseService.getCourse(
          this.courseId,
        ),

      activities:
        this.activityService.getByCourse(
          this.courseId,
        ),
    }).subscribe({
      next: ({
        course,
        activities,
      }) => {
        this.course.set(course);

        this.activities.set(
          activities,
        );

        /*
        * Restore the student's saved
        * grade goal from the database.
        */
        if (
          course.gpa_goal != null
        ) {
          const savedGoal =
            Number(
              course.gpa_goal,
            );

          if (
            Number.isFinite(
              savedGoal,
            )
          ) {
            this.target.set(
              Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    savedGoal,
                  ),
                ),
              ),
            );
          }
        }

        this.loading.set(false);
      },

      error: () => {
        this.error.set(
          'Could not load this course.',
        );

        this.loading.set(false);
      },
    });
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  protected isCompleted(
    activity: Activity,
  ): boolean {
    return (
      activity.grade != null ||
      activity.status ===
        'graded' ||
      activity.status ===
        'submitted'
    );
  }

  protected isOverdue(
    activity: Activity,
  ): boolean {
    return (
      !this.isCompleted(activity) &&
      activity.due_date != null &&
      new Date(
        activity.due_date,
      ) < new Date()
    );
  }

  protected activityStatusLabel(
    activity: Activity,
  ): string {
    if (
      this.isOverdue(activity)
    ) {
      return 'Overdue';
    }

    if (
      this.isCompleted(activity)
    ) {
      return activity.grade != null
        ? 'Graded'
        : 'Submitted';
    }

    return activity.status
      .replaceAll('_', ' ');
  }

  protected dueLabel(
    activity: Activity,
  ): string {
    if (!activity.due_date) {
      return 'No date';
    }

    const due =
      new Date(
        activity.due_date,
      );

    const now =
      new Date();

    const diff =
      due.getTime() -
      now.getTime();

    const days =
      Math.ceil(
        diff /
          (1000 *
            60 *
            60 *
            24),
      );

    if (days < 0) {
      const late =
        Math.abs(days);

      return `${late} ${
        late === 1
          ? 'day'
          : 'days'
      } overdue`;
    }

    if (days === 0) {
      return 'Due today';
    }

    if (days === 1) {
      return 'Due tomorrow';
    }

    return `Due in ${days} days`;
  }

  private activitySortValue(
    activity: Activity,
  ): number {
    if (!activity.due_date) {
      return Number.MAX_SAFE_INTEGER;
    }

    return new Date(
      activity.due_date,
    ).getTime();
  }

  /* =========================================================
     UI ACTIONS
     ========================================================= */

  protected setTab(
    tab: CourseTab,
  ): void {
    this.selectedTab.set(tab);
  }

  protected setAssignmentFilter(
    filter: AssignmentFilter,
  ): void {
    this.assignmentFilter.set(
      filter,
    );
  }

  protected setAssignmentSearch(
    value: string,
  ): void {
    this.assignmentSearch.set(
      value,
    );
  }

  protected toggleActionMenu(): void {
    this.actionMenuOpen.update(
      (open) => !open,
    );
  }

  /* =========================================================
     COURSE ACTIONS
     ========================================================= */

  protected toggleArchive(): void {
    const course =
      this.course();

    if (!course) {
      return;
    }

    this.actionMenuOpen.set(
      false,
    );

    this.busy.set(true);

    this.courseService
      .setArchived(
        this.courseId,
        !course.archived,
      )
      .subscribe({
        next: () => {
          this.course.set({
            ...course,
            archived:
              !course.archived,
          });

          this.busy.set(false);
        },

        error: () => {
          this.busy.set(false);

          this.error.set(
            'Could not update archive state.',
          );
        },
      });
  }

  protected deleteCourse(): void {
    const course =
      this.course();

    if (!course) {
      return;
    }

    this.actionMenuOpen.set(
      false,
    );

    if (
      !confirm(
        `Delete "${course.course_code} — ${course.course_name}" and all its assignments? This cannot be undone.`,
      )
    ) {
      return;
    }

    this.busy.set(true);

    this.courseService
      .deleteCourse(
        this.courseId,
      )
      .subscribe({
        next: () =>
          this.router.navigateByUrl(
            '/courses',
          ),

        error: () => {
          this.busy.set(false);

          this.error.set(
            'Could not delete the course.',
          );
        },
      });
  }
}