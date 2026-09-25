import { Component, inject, signal } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  Router,
  RouterLink,
} from '@angular/router';

import {
  CourseService,
} from '../../../core/services/course.service';

import {
  CourseColor,
  COURSE_THEME_OPTIONS,
} from '../../../core/models/course';


@Component({
  selector: 'app-add-course',

  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],

  templateUrl: './add-course.html',

  styleUrl: './add-course.css',
})
export class AddCourse {
  private readonly fb =
    inject(FormBuilder);

  private readonly courseService =
    inject(CourseService);

  private readonly router =
    inject(Router);


  /* =========================================================
     STATE
     ========================================================= */

  protected readonly loading =
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

      /*
       * Default course theme.
       *
       * The student can change this
       * using the gradient picker.
       */
      colorTheme: [
        'violet' as CourseColor,
      ],
    });


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
     SUBMIT
     ========================================================= */

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.error.set(null);

    this.loading.set(true);

    const value =
      this.form.getRawValue();


    this.courseService
      .createCourse({
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
      })
      .subscribe({
        next: () => {
          this.router.navigateByUrl(
            '/courses',
          );
        },

        error: (err) => {
          this.loading.set(false);

          this.error.set(
            err?.error
              ?.errors?.[0] ??
              err?.error
                ?.message ??
              'Could not create the course.',
          );
        },
      });
  }
}