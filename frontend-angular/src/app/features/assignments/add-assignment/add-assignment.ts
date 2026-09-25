import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ActivityService } from '../../../core/services/activity.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course';

@Component({
  selector: 'app-add-assignment',

  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],

  templateUrl: './add-assignment.html',

  styleUrl: './add-assignment.css',
})
export class AddAssignment {
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


  /* =========================================================
     STATE
     ========================================================= */

  protected readonly courses =
    signal<Course[]>([]);

  protected readonly loading =
    signal(false);

  protected readonly loadingCourses =
    signal(true);

  protected readonly error =
    signal<string | null>(null);


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

      /*
       * Due date is OPTIONAL.
       */
      dueDate: [''],

      weight: [
        0,
        [
          Validators.min(0),
          Validators.max(100),
        ],
      ],
    });


  /* =========================================================
     SELECTED COURSE
     ========================================================= */

  protected readonly selectedCourse =
    computed(() => {
      const id =
        Number(
          this.form.controls
            .courseId.value,
        );

      return (
        this.courses().find(
          (course) =>
            course.id === id,
        ) ?? null
      );
    });


  /* =========================================================
     LOAD COURSES
     ========================================================= */

  constructor() {
    /*
     * Coming from:
     * /courses/123 -> Add assignment
     *
     * gives us:
     * /assignments/new?course=123
     */
    const preselectedCourse =
      Number(
        this.route.snapshot
          .queryParamMap
          .get('course'),
      );

    if (preselectedCourse) {
      this.form.patchValue({
        courseId:
          preselectedCourse,
      });
    }


    this.courseService
      .getCourses()
      .subscribe({
        next: (courses) => {
          /*
           * Usually we only want active
           * courses for new work.
           */
          this.courses.set(
            courses.filter(
              (course) =>
                !course.archived,
            ),
          );

          this.loadingCourses.set(
            false,
          );
        },

        error: () => {
          this.loadingCourses.set(
            false,
          );

          this.error.set(
            'Could not load your courses.',
          );
        },
      });
  }


  /* =========================================================
     SUBMIT
     ========================================================= */

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const value =
      this.form.getRawValue();

    this.error.set(null);

    this.loading.set(true);


    this.activityService
      .addActivity({
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
            ? value.dueDate.replace(
                'T',
                ' ',
              )
            : null,

        weight:
          Number(
            value.weight,
          ),
      })
      .subscribe({
        next: (created) => {
          /*
           * Open the newly created
           * assignment workspace.
           */
          this.router.navigate([
            '/assignments',
            created.activity_id,
          ]);
        },

        error: (err) => {
          this.loading.set(
            false,
          );

          this.error.set(
            err?.error
              ?.errors?.[0] ??
              err?.error
                ?.message ??
              'Could not add the assignment.',
          );
        },
      });
  }


  /* =========================================================
     CANCEL
     ========================================================= */

  protected cancel(): void {
    const courseId =
      Number(
        this.form.controls
          .courseId.value,
      );

    /*
     * If the user came from a course,
     * take them back there.
     */
    if (courseId > 0) {
      this.router.navigate([
        '/courses',
        courseId,
      ]);

      return;
    }

    this.router.navigateByUrl(
      '/assignments',
    );
  }
}