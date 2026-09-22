import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Activity } from '../models/activity';

export interface NewActivityInput {
  courseId: number;
  categoryId: number;
  name: string;
  dueDate: string;
  weight: number;
}

export interface UpdateActivityInput {
  courseId: number;
  categoryId: number;
  name: string;
  dueDate: string | null; // 'YYYY-MM-DDTHH:MM' or null
  weight: number;
  grade: number | null;
  status: string;
  instructions: string | null;
  notes: string | null;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBase;

  getAllActivities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.api}/user/activities`);
  }

  addActivity(input: NewActivityInput): Observable<unknown> {
    return this.http.post(`${this.api}/user/activities`, {
      activity: {
        course_id: input.courseId,
        activity_category_id: input.categoryId,
        activity_name: input.name,
        due_date: input.dueDate,
        grading_weight: input.weight,
      },
    });
  }

  updateActivity(activityId: number, input: UpdateActivityInput): Observable<Activity> {
    return this.http.put<Activity>(`${this.api}/user/activities/${activityId}`, {
      activity: {
        course_id: input.courseId,
        activity_category_id: input.categoryId,
        activity_name: input.name,
        due_date: input.dueDate,
        grading_weight: input.weight,
        grade: input.grade,
        status: input.status,
        instructions: input.instructions,
        notes: input.notes,
      },
    });
  }

  deleteActivity(activityId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/user/activities/${activityId}`);
  }

  getByCourse(courseId: number): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.api}/user/courses/${courseId}/activities`);
  }
}