import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ActivityService,
} from '../../core/services/activity.service';

import {
  CourseService,
} from '../../core/services/course.service';

import {
  Activity,
  CATEGORY_ID_TO_NAME,
} from '../../core/models/activity';

type Filter =
  | 'all'
  | 'upcoming'
  | 'overdue'
  | 'completed';

type SortOption =
  | 'due'
  | 'name'
  | 'course'
  | 'weight'
  | 'grade';

@Component({
  selector: 'app-assignments',
  imports: [
    RouterLink,
    DatePipe,
  ],
  templateUrl: './assignments.html',
  styleUrl: './assignments.css',
})
export class Assignments {
  private readonly activityService =
    inject(ActivityService);

  private readonly courseService =
    inject(CourseService);

  protected readonly activities =
    signal<Activity[]>([]);

  protected readonly courseCodes =
    signal<Record<number, string>>({});

  protected readonly loading =
    signal(true);

  protected readonly error =
    signal<string | null>(null);

  protected readonly filter =
    signal<Filter>('all');

  protected readonly searchQuery =
    signal('');

  protected readonly sortBy =
    signal<SortOption>('due');

  protected readonly categoryName =
    CATEGORY_ID_TO_NAME;


  /* =========================================================
     COUNTS
     ========================================================= */

  protected readonly allCount =
    computed(() =>
      this.activities().length,
    );

  protected readonly upcomingCount =
    computed(() =>
      this.activities().filter(
        (activity) =>
          this.isUpcoming(activity),
      ).length,
    );

  protected readonly overdueCount =
    computed(() =>
      this.activities().filter(
        (activity) =>
          this.isOverdue(activity),
      ).length,
    );

  protected readonly completedCount =
    computed(() =>
      this.activities().filter(
        (activity) =>
          this.isCompleted(activity),
      ).length,
    );


  /* =========================================================
     FILTERED + SORTED LIST
     ========================================================= */

  protected readonly visible =
    computed(() => {
      const query =
        this.searchQuery()
          .trim()
          .toLowerCase();

      let result =
        [...this.activities()];


      switch (this.filter()) {
        case 'upcoming':
          result =
            result.filter(
              (activity) =>
                this.isUpcoming(
                  activity,
                ),
            );
          break;

        case 'overdue':
          result =
            result.filter(
              (activity) =>
                this.isOverdue(
                  activity,
                ),
            );
          break;

        case 'completed':
          result =
            result.filter(
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
        result =
          result.filter(
            (activity) => {
              const course =
                this.courseCode(
                  activity.course_id,
                );

              const type =
                this.categoryName[
                  activity
                    .activity_category_id
                ] ?? '';

              return [
                activity.activity_name,
                course,
                type,
                activity.status,
              ]
                .join(' ')
                .toLowerCase()
                .includes(query);
            },
          );
      }


      return result.sort(
        (a, b) => {
          switch (
            this.sortBy()
          ) {
            case 'name':
              return (
                a.activity_name
                  .localeCompare(
                    b.activity_name,
                  )
              );

            case 'course':
              return (
                this.courseCode(
                  a.course_id,
                ).localeCompare(
                  this.courseCode(
                    b.course_id,
                  ),
                )
              );

            case 'weight':
              return (
                Number(
                  b.grading_weight ??
                    -1,
                ) -
                Number(
                  a.grading_weight ??
                    -1,
                )
              );

            case 'grade':
              return (
                Number(
                  b.grade ?? -1,
                ) -
                Number(
                  a.grade ?? -1,
                )
              );

            case 'due':
            default:
              return (
                this.dateValue(a) -
                this.dateValue(b)
              );
          }
        },
      );
    });


  /* =========================================================
     LOAD
     ========================================================= */

  constructor() {
    forkJoin({
      activities:
        this.activityService
          .getAllActivities(),

      courses:
        this.courseService
          .getCourses(),
    }).subscribe({
      next: ({
        activities,
        courses,
      }) => {
        this.activities.set(
          activities,
        );

        const map:
          Record<number, string> =
          {};

        for (
          const course
          of courses
        ) {
          map[course.id] =
            course.code;
        }

        this.courseCodes.set(
          map,
        );

        this.loading.set(
          false,
        );
      },

      error: () => {
        this.error.set(
          'Could not load your assignments.',
        );

        this.loading.set(
          false,
        );
      },
    });
  }


  /* =========================================================
     FILTERS
     ========================================================= */

  protected setFilter(
    filter: Filter,
  ): void {
    this.filter.set(
      filter,
    );
  }

  protected setSearch(
    value: string,
  ): void {
    this.searchQuery.set(
      value,
    );
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected setSort(
    value: string,
  ): void {
    if (
      value === 'due' ||
      value === 'name' ||
      value === 'course' ||
      value === 'weight' ||
      value === 'grade'
    ) {
      this.sortBy.set(
        value,
      );
    }
  }


  /* =========================================================
     HELPERS
     ========================================================= */

  protected courseCode(
    courseId: number,
  ): string {
    return (
      this.courseCodes()[
        courseId
      ] ?? '—'
    );
  }


  protected isCompleted(
    activity: Activity,
  ): boolean {
    return (
      activity.status ===
        'submitted' ||
      activity.status ===
        'graded'
    );
  }


  protected isOverdue(
    activity: Activity,
  ): boolean {
    if (
      this.isCompleted(
        activity,
      )
    ) {
      return false;
    }

    if (!activity.due_date) {
      return false;
    }

    return (
      new Date(
        activity.due_date,
      ) < new Date()
    );
  }


  protected isUpcoming(
    activity: Activity,
  ): boolean {
    return (
      !this.isCompleted(
        activity,
      ) &&
      !this.isOverdue(
        activity,
      )
    );
  }


  protected statusLabel(
    activity: Activity,
  ): string {
    if (
      this.isOverdue(
        activity,
      )
    ) {
      return 'Overdue';
    }

    switch (
      activity.status
    ) {
      case 'in_progress':
        return 'In progress';

      case 'submitted':
        return 'Submitted';

      case 'graded':
        return 'Graded';

      default:
        return 'Not started';
    }
  }


  protected dueMeta(
    activity: Activity,
  ): string {
    if (!activity.due_date) {
      return 'No date set';
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
          (
            1000 *
            60 *
            60 *
            24
          ),
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


  private dateValue(
    activity: Activity,
  ): number {
    if (!activity.due_date) {
      return (
        Number.MAX_SAFE_INTEGER
      );
    }

    return new Date(
      activity.due_date,
    ).getTime();
  }
}