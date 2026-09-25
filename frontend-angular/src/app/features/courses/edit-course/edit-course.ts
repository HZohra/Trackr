import {
  Component,
  inject,
  signal,
} from '@angular/core';

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

import {
  CourseService,
} from '../../../core/services/course.service';

import {
  CourseColor,
  COURSE_THEME_OPTIONS,
  courseColorFromStored,
} from '../../../core/models/course';


@Component({
  selector: 'app-edit-course',

  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],

  templateUrl: './edit-course.html',

  styleUrl: './edit-course.css',
})
export class EditCourse {
  private readonly fb =
    inject(FormBuilder);

  private readonly courseService =
    inject(CourseService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly courseId =
    Number(
      this.route.snapshot
        .paramMap
        .get('id'),
    );


  /* =========================================================
     STATE
     ========================================================= */

  protected readonly loading =
    signal(true);

  protected readonly saving =
    signal(false);

  protected readonly error =
    signal<string | null>(null);


  /* =========================================================
     COURSE THEMES
     ========================================================= */

  protected readonly courseThemes =
    COURSE_THEME_OPTIONS;


  /* =========================================================
     FORM
     ========================================================= */

  protected readonly form =
    this.fb.nonNullable.group({
      courseCode: [
        '',
        [
          Validators.required,
        ],
      ],

      courseName: [
        '',
        [
          Validators.required,
        ],
      ],

      term: [
        '',
        [
          Validators.required,
        ],
      ],

      professor: [''],

      termEnd: [''],

      colorTheme: [
        'violet' as CourseColor,
      ],
    });


  /* =========================================================
     LOAD COURSE
     ========================================================= */

  constructor() {
    this.courseService
      .getCourse(
        this.courseId,
      )
      .subscribe({
        next: (course) => {
          this.form.setValue({
            courseCode:
              course.course_code,

            courseName:
              course.course_name,

            term:
              course.term,

            professor:
              course.professor_name ??
              '',

            termEnd:
              course.term_end
                ? course.term_end.slice(
                    0,
                    10,
                  )
                : '',

            colorTheme:
              courseColorFromStored(
                course.color_theme,
                this.courseId,
              ),
          });

          this.loading.set(
            false,
          );
        },

        error: () => {
          this.error.set(
            'Could not load this course.',
          );

          this.loading.set(
            false,
          );
        },
      });
  }


  /* =========================================================
     SELECTED THEME
     ========================================================= */

  protected selectedTheme() {
    return (
      this.courseThemes.find(
        (theme) =>
          theme.key ===
          this.form.controls
            .colorTheme.value,
      ) ??
      this.courseThemes[1]
    );
  }


  /* =========================================================
     SAVE
     ========================================================= */

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.error.set(null);

    this.saving.set(true);

    const value =
      this.form.getRawValue();


    this.courseService
      .updateCourse(
        this.courseId,
        {
          courseCode:
            value.courseCode.trim(),

          courseName:
            value.courseName.trim(),

          term:
            value.term.trim(),

          professor:
            value.professor.trim(),

          termEnd:
            value.termEnd,

          colorTheme:
            value.colorTheme,
        },
      )
      .subscribe({
        next: () => {
          this.router.navigateByUrl(
            '/courses',
          );
        },

        error: (err) => {
          this.saving.set(
            false,
          );

          this.error.set(
            err?.error
              ?.errors?.[0] ??
              err?.error
                ?.message ??
              'Could not save the course.',
          );
        },
      });
  }
}