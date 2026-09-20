import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Course, CourseColor } from '../models/course';

interface CourseRow {
  course_id: number;
  course_code: string;
  course_name: string;
  professor_name: string | null;
  final_grade: string | null;
  archived: boolean;
}

export interface NewCourseInput {
  courseCode: string;
  courseName: string;
  term: string;
  professor: string;
  termEnd: string; // '' or 'YYYY-MM-DD'
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBase;
  private readonly palette: CourseColor[] = ['sky', 'violet', 'amber', 'coral', 'teal', 'lime', 'rose', 'slate'];

  getCourses(): Observable<Course[]> {
    return this.http
      .get<CourseRow[]>(`${this.api}/user/courses`)
      .pipe(map((rows) => rows.map((row, i) => this.toCourse(row, i))));
  }

  // Sends the course to POST /user/courses/ in the { course, activities } shape
  // the backend validator expects. No activities for a manual add.
  createCourse(input: NewCourseInput): Observable<unknown> {
    return this.http.post(`${this.api}/user/courses/`, {
      course: {
        course_code: input.courseCode,
        course_name: input.courseName,
        term: input.term,
        professor_name: input.professor || null,
        term_end: input.termEnd || null,
      },
      activities: [],
    });
  }

  private toCourse(row: CourseRow, index: number): Course {
    return {
      id: row.course_id,
      code: row.course_code,
      name: row.course_name,
      professor: row.professor_name ?? '',
      color: this.palette[index % this.palette.length],
      currentGrade: row.final_grade != null ? Number(row.final_grade) : null,
      percentComplete: 0,
    };
  }
}