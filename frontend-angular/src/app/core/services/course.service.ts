import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Course, CourseColor } from '../models/course';

// The raw row shape the API returns (snake_case, straight from the DB).
interface CourseRow {
  course_id: number;
  course_code: string;
  course_name: string;
  professor_name: string | null;
  final_grade: string | null;
  archived: boolean;
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

  // Maps a raw DB row into the UI Course shape the card expects.
  private toCourse(row: CourseRow, index: number): Course {
    return {
      id: row.course_id,
      code: row.course_code,
      name: row.course_name,
      professor: row.professor_name ?? '',
      color: this.palette[index % this.palette.length],
      currentGrade: row.final_grade != null ? Number(row.final_grade) : null,
      percentComplete: 0, // fills in once activities are wired (needs the activity data)
    };
  }
}