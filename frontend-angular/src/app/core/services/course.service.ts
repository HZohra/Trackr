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

interface CourseDetailRow {
  course_id: number;
  course_code: string;
  course_name: string;
  professor_name: string | null;
  term: string;
  term_end: string | null;
}

export interface NewCourseInput {
  courseCode: string;
  courseName: string;
  term: string;
  professor: string;
  termEnd: string;
}

// What the syllabus extractor hands back for review.
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
  };
  activities: ExtractedActivity[];
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

    getCourse(id: number): Observable<CourseDetailRow> {
    return this.http.get<CourseDetailRow>(`${this.api}/user/courses/${id}`);
  }

  updateCourse(id: number, input: NewCourseInput): Observable<unknown> {
    return this.http.patch(`${this.api}/user/courses/${id}`, {
      course: {
        course_code: input.courseCode,
        course_name: input.courseName,
        term: input.term,
        professor_name: input.professor || null,
        term_end: input.termEnd || null,
      },
    });
  }

  // Sends the PDF (+ term) to the extractor. Returns the extracted course +
  // assignments for review — nothing is saved yet.
  uploadSyllabus(file: File, term: string): Observable<ExtractionResult> {
    const form = new FormData();
    form.append('file', file); // field name MUST be "file" (multer)
    form.append('term', term);
    return this.http.post<ExtractionResult>(`${this.api}/user/upload-syllabus`, form);
  }

  // Saves a reviewed extraction as a real course + its activities, via the same
  // endpoint the manual form uses.
    // Saves a reviewed extraction. Converts each category NAME ("Assignment") to
  // the id (1-4) the save endpoint expects.
  saveExtracted(result: ExtractionResult): Observable<unknown> {
    const nameToId: Record<string, number> = { Assignment: 1, Quiz: 2, Exam: 3, Project: 4, Lab: 5, Other: 6  };
    return this.http.post(`${this.api}/user/courses/`, {
      course: result.course,
      activities: result.activities.map((a) => ({
        activity_category_id: nameToId[a.activity_category] ?? 1,
        activity_name: a.activity_name,
        due_date: a.due_date,
        grading_weight: a.grading_weight,
      })),
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