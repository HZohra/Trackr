import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DatePipe } from '@angular/common';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import { forkJoin } from 'rxjs';

import {
  ActivityService,
} from '../../../core/services/activity.service';

import {
  CourseService,
} from '../../../core/services/course.service';

import {
  Course,
} from '../../../core/models/course';

import {
  Activity,
  CATEGORY_ID_TO_NAME,
} from '../../../core/models/activity';


@Component({
  selector: 'app-assignment-detail',

  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
  ],

  templateUrl: './assignment-detail.html',

  styleUrl: './assignment-detail.css',
})
export class AssignmentDetail {
  private readonly fb =
    inject(FormBuilder);

  private readonly activityService =
    inject(ActivityService);

  private readonly courseService =
    inject(CourseService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  protected readonly id =
    Number(
      this.route.snapshot.paramMap.get('id'),
    );


  /* =========================================================
     PAGE STATE
     ========================================================= */

  protected readonly activity =
    signal<Activity | null>(null);

  protected readonly courses =
    signal<Course[]>([]);

  protected readonly loading =
    signal(true);

  protected readonly saving =
    signal(false);

  protected readonly error =
    signal<string | null>(null);

  protected readonly editing =
    signal(false);

  protected readonly actionMenuOpen =
    signal(false);


  /* =========================================================
     OPTIONS
     ========================================================= */

  protected readonly categories = [
    {
      id: 1,
      name: 'Assignment',
    },
    {
      id: 2,
      name: 'Quiz',
    },
    {
      id: 3,
      name: 'Exam',
    },
    {
      id: 4,
      name: 'Project',
    },
    {
      id: 5,
      name: 'Lab',
    },
    {
      id: 6,
      name: 'Other',
    },
  ];

  protected readonly statuses = [
    {
      value: 'not_started',
      label: 'Not started',
    },
    {
      value: 'in_progress',
      label: 'In progress',
    },
    {
      value: 'submitted',
      label: 'Submitted',
    },
    {
      value: 'graded',
      label: 'Graded',
    },
  ];

  protected readonly categoryName =
    CATEGORY_ID_TO_NAME;


  /* =========================================================
     DERIVED DATA
     ========================================================= */

  protected readonly course =
    computed(() => {
      const activity =
        this.activity();

      if (!activity) {
        return null;
      }

      return (
        this.courses().find(
          (course) =>
            course.id ===
            activity.course_id,
        ) ?? null
      );
    });


  protected readonly typeLabel =
    computed(() => {
      const activity =
        this.activity();

      if (!activity) {
        return 'Activity';
      }

      return (
        this.categoryName[
          activity.activity_category_id
        ] ?? 'Activity'
      );
    });


  protected readonly weight =
    computed(() => {
      const value =
        this.activity()
          ?.grading_weight;

      if (
        value === null ||
        value === undefined
      ) {
        return null;
      }

      return Number(value);
    });


  protected readonly grade =
    computed(() => {
      const value =
        this.activity()?.grade;

      if (
        value === null ||
        value === undefined
      ) {
        return null;
      }

      return Number(value);
    });


  protected readonly overdue =
    computed(() => {
      const activity =
        this.activity();

      if (
        !activity ||
        !activity.due_date
      ) {
        return false;
      }

      if (
        activity.grade != null ||
        activity.status ===
          'submitted' ||
        activity.status ===
          'graded'
      ) {
        return false;
      }

      return (
        new Date(
          activity.due_date,
        ) < new Date()
      );
    });


  protected readonly statusLabel =
    computed(() => {
      const activity =
        this.activity();

      if (!activity) {
        return '';
      }

      if (this.overdue()) {
        return 'Overdue';
      }

      const status =
        this.statuses.find(
          (item) =>
            item.value ===
            activity.status,
        );

      return (
        status?.label ??
        activity.status.replaceAll(
          '_',
          ' ',
        )
      );
    });


  /* =========================================================
     FORM
     ========================================================= */

  protected readonly form =
    this.fb.nonNullable.group({
      courseId: [
        0,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],

      categoryId: [
        1,
        [
          Validators.required,
        ],
      ],

      name: [
        '',
        [
          Validators.required,
        ],
      ],

      dueDate: [''],

      weight: [0],

      grade: [''],

      status: [
        'not_started',
      ],

      instructions: [''],

      notes: [''],
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
        this.courses.set(
          courses,
        );

        const activity =
          activities.find(
            (item) =>
              item.activity_id ===
              this.id,
          );

        if (!activity) {
          this.error.set(
            'Assignment not found.',
          );

          this.loading.set(
            false,
          );

          return;
        }

        this.activity.set(
          activity,
        );

        this.populateForm(
          activity,
        );

        this.loading.set(
          false,
        );
      },

      error: () => {
        this.error.set(
          'Could not load this assignment.',
        );

        this.loading.set(
          false,
        );
      },
    });
  }


  /* =========================================================
     FORM HELPERS
     ========================================================= */

  private populateForm(
    activity: Activity,
  ): void {
    this.form.patchValue({
      courseId:
        activity.course_id,

      categoryId:
        activity
          .activity_category_id,

      name:
        activity.activity_name,

      dueDate:
        activity.due_date
          ? activity.due_date
              .slice(0, 16)
              .replace(
                ' ',
                'T',
              )
          : '',

      weight:
        activity
          .grading_weight != null
          ? Number(
              activity
                .grading_weight,
            )
          : 0,

      grade:
        activity.grade != null
          ? String(
              activity.grade,
            )
          : '',

      status:
        activity.status,

      instructions:
        activity.instructions ??
        '',

      notes:
        activity.notes ?? '',
    });
  }


  /* =========================================================
     EDIT MODE
     ========================================================= */

  protected startEditing(): void {
    const activity =
      this.activity();

    if (!activity) {
      return;
    }

    this.populateForm(
      activity,
    );

    this.error.set(null);

    this.editing.set(true);

    this.actionMenuOpen.set(
      false,
    );
  }


  protected cancelEditing(): void {
    const activity =
      this.activity();

    if (activity) {
      this.populateForm(
        activity,
      );
    }

    this.error.set(null);

    this.editing.set(false);
  }


  /* =========================================================
     SAVE
     ========================================================= */

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const value =
      this.form.getRawValue();

    const grade =
      value.grade === ''
        ? null
        : Number(value.grade);

    if (
      grade != null &&
      (
        !Number.isFinite(
          grade,
        ) ||
        grade < 0 ||
        grade > 100
      )
    ) {
      this.error.set(
        'Grade must be between 0 and 100.',
      );

      return;
    }

    const weight =
      Number(value.weight);

    if (
      !Number.isFinite(
        weight,
      ) ||
      weight < 0 ||
      weight > 100
    ) {
      this.error.set(
        'Weight must be between 0 and 100.',
      );

      return;
    }

    this.saving.set(true);

    this.error.set(null);

    this.activityService
      .updateActivity(
        this.id,
        {
          courseId:
            Number(
              value.courseId,
            ),

          categoryId:
            Number(
              value.categoryId,
            ),

          name:
            value.name.trim(),

          dueDate:
            value.dueDate
              ? value.dueDate
              : null,

          weight,

          grade,

          status:
            value.status,

          instructions:
            value.instructions
              .trim()
              ? value.instructions
              : null,

          notes:
            value.notes
              .trim()
              ? value.notes
              : null,
        },
      )
      .subscribe({
        next: (
          updated,
        ) => {
          /*
           * The backend returns the
           * updated Activity row.
           */
          this.activity.set(
            updated,
          );

          this.populateForm(
            updated,
          );

          this.saving.set(
            false,
          );

          this.editing.set(
            false,
          );
        },

        error: (
          err,
        ) => {
          this.saving.set(
            false,
          );

          this.error.set(
            err?.error
              ?.errors?.[0] ??
              err?.error
                ?.message ??
              'Could not save this assignment.',
          );
        },
      });
  }


  /* =========================================================
     ACTION MENU
     ========================================================= */

  protected toggleActionMenu(): void {
    this.actionMenuOpen.update(
      (open) => !open,
    );
  }


  /* =========================================================
     DELETE
     ========================================================= */

  protected onDelete(): void {
    const activity =
      this.activity();

    if (!activity) {
      return;
    }

    this.actionMenuOpen.set(
      false,
    );

    if (
      !confirm(
        `Delete "${activity.activity_name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    this.saving.set(true);

    this.activityService
      .deleteActivity(
        this.id,
      )
      .subscribe({
        next: () => {
          this.router.navigateByUrl(
            '/assignments',
          );
        },

        error: (
          err,
        ) => {
          this.saving.set(
            false,
          );

          this.error.set(
            err?.error
              ?.message ??
              'Could not delete this assignment.',
          );
        },
      });
  }
}