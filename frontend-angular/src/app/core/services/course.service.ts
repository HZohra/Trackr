import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  Course,
  CourseColor,
  courseColorFromStored,
} from '../models/course';


/* ==========================================================================
   API ROW TYPES
   ========================================================================== */

interface CourseRow {
  course_id: number;
  course_code: string;
  course_name: string;
  professor_name: string | null;

  final_grade: string | null;

  archived: boolean;

  /*
   * Saved custom color.
   *
   * Existing courses may still have null,
   * in which case Trackr falls back to
   * colorForCourse(courseId).
   */
  color_theme: CourseColor | null;
}


export interface CourseDetailRow {
  course_id: number;

  course_code: string;

  course_name: string;

  professor_name: string | null;

  term: string;

  term_end: string | null;

  final_grade: string | null;

  archived: boolean;

  gpa_goal: string | null;

  office_hours: string | null;

  meeting_times: string | null;

  room: string | null;

  textbook_link: string | null;

  /*
   * User-selected course appearance.
   */
  color_theme: CourseColor | null;
}


/* ==========================================================================
   CREATE / UPDATE INPUT
   ========================================================================== */

export interface NewCourseInput {
  courseCode: string;

  courseName: string;

  term: string;

  professor: string;

  termEnd: string;

  /*
   * Selected from the Trackr color palette.
   */
  colorTheme: CourseColor;
}


/* ==========================================================================
   SYLLABUS EXTRACTION TYPES
   ========================================================================== */

export interface ExtractedActivity {
  activity_category: string;

  activity_name: string;

  due_date: string | null;

  grading_weight: number | null;
}


export interface ExtractionResult {
  course: {
    course_code: string;

    course_name: string;

    professor_name: string | null;

    term: string;

    office_hours?: string | null;

    meeting_times?: string | null;

    room?: string | null;

    textbook_link?: string | null;

    gpa_goal?: number | null;

    /*
     * Optional because AI extraction does not
     * need to choose a course color.
     *
     * We can later let the syllabus review
     * screen choose one before saving.
     */
    color_theme?: CourseColor | null;
  };

  activities: ExtractedActivity[];
}


/* ==========================================================================
   SERVICE
   ========================================================================== */

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly http =
    inject(HttpClient);

  private readonly api =
    environment.apiBase;


  /* ==========================================================================
     GET ALL COURSES
     ========================================================================== */

  getCourses(): Observable<Course[]> {
    return this.http
      .get<CourseRow[]>(
        `${this.api}/user/courses`,
      )
      .pipe(
        map((rows) =>
          rows.map((row) =>
            this.toCourse(row),
          ),
        ),
      );
  }


  /* ==========================================================================
     GET ONE COURSE
     ========================================================================== */

  getCourse(
    id: number,
  ): Observable<CourseDetailRow> {
    return this.http.get<CourseDetailRow>(
      `${this.api}/user/courses/${id}`,
    );
  }


  /* ==========================================================================
     CREATE COURSE
     ========================================================================== */

  createCourse(
    input: NewCourseInput,
  ): Observable<unknown> {
    return this.http.post(
      `${this.api}/user/courses/`,
      {
        course: {
          course_code:
            input.courseCode,

          course_name:
            input.courseName,

          term:
            input.term,

          professor_name:
            input.professor || null,

          term_end:
            input.termEnd || null,

          /*
           * New saved course color.
           */
          color_theme:
            input.colorTheme,
        },

        activities: [],
      },
    );
  }


  /* ==========================================================================
     UPDATE COURSE
     ========================================================================== */

  updateCourse(
    id: number,
    input: NewCourseInput,
  ): Observable<unknown> {
    return this.http.patch(
      `${this.api}/user/courses/${id}`,
      {
        course: {
          course_code:
            input.courseCode,

          course_name:
            input.courseName,

          term:
            input.term,

          professor_name:
            input.professor || null,

          term_end:
            input.termEnd || null,

          /*
           * Save the user's selected
           * course color.
           */
          color_theme:
            input.colorTheme,
        },
      },
    );
  }


  /* ==========================================================================
     GRADE GOAL
     ========================================================================== */

  setGpaGoal(
    id: number,
    goal: number | null,
  ): Observable<unknown> {
    return this.http.patch(
      `${this.api}/user/courses/${id}`,
      {
        course: {
          gpa_goal: goal,
        },
      },
    );
  }


  /* ==========================================================================
     COURSE COLOR
     ========================================================================== */

  /*
   * Optional standalone method.
   *
   * This lets us change only the color later
   * without submitting the whole Edit Course form.
   *
   * We don't need it for the current Edit Course
   * page, but it will be useful if we later add a
   * quick color picker directly on a course card.
   */
  setColorTheme(
    id: number,
    colorTheme: CourseColor,
  ): Observable<unknown> {
    return this.http.patch(
      `${this.api}/user/courses/${id}`,
      {
        course: {
          color_theme:
            colorTheme,
        },
      },
    );
  }


  /* ==========================================================================
     DELETE COURSE
     ========================================================================== */

  deleteCourse(
    id: number,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/user/courses/${id}`,
    );
  }


  /* ==========================================================================
     ARCHIVE / RESTORE COURSE
     ========================================================================== */

  setArchived(
    id: number,
    archived: boolean,
  ): Observable<unknown> {
    return this.http.patch(
      `${this.api}/user/courses/${id}/archive`,
      {
        archived,
      },
    );
  }


  /* ==========================================================================
     UPLOAD SYLLABUS
     ========================================================================== */

  uploadSyllabus(
    file: File,
    term: string,
  ): Observable<ExtractionResult> {
    const form =
      new FormData();

    form.append(
      'file',
      file,
    );

    form.append(
      'term',
      term,
    );

    return this.http.post<ExtractionResult>(
      `${this.api}/user/upload-syllabus`,
      form,
    );
  }


  /* ==========================================================================
     SAVE EXTRACTED SYLLABUS
     ========================================================================== */

  saveExtracted(
    result: ExtractionResult,
  ): Observable<unknown> {
    const nameToId:
      Record<string, number> = {
        Assignment: 1,
        Quiz: 2,
        Exam: 3,
        Project: 4,
        Lab: 5,
        Other: 6,
      };


    return this.http.post(
      `${this.api}/user/courses/`,
      {
        course:
          result.course,

        activities:
          result.activities.map(
            (activity) => ({
              activity_category_id:
                nameToId[
                  activity
                    .activity_category
                ] ?? 1,

              activity_name:
                activity
                  .activity_name,

              due_date:
                activity.due_date,

              grading_weight:
                activity
                  .grading_weight,
            }),
          ),
      },
    );
  }


  /* ==========================================================================
     API COURSE → UI COURSE
     ========================================================================== */

  private toCourse(
    row: CourseRow,
  ): Course {
    return {
      id:
        row.course_id,

      code:
        row.course_code,

      name:
        row.course_name,

      professor:
        row.professor_name ?? '',

      /*
       * Use the student's saved color.
       *
       * If this is an old course and
       * color_theme is null, the helper
       * falls back to the original automatic
       * color based on course ID.
       */
      color:
        courseColorFromStored(
          row.color_theme,
          row.course_id,
        ),

      currentGrade:
        row.final_grade != null
          ? Number(
              row.final_grade,
            )
          : null,

      percentComplete:
        0,

      archived:
        row.archived,
    };
  }
}