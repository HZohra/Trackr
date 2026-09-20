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

  // Sets grade (null clears it) and status on one assignment; returns the updated row.
  updateActivity(activityId: number, grade: number | null, status: string): Observable<Activity> {
    return this.http.put<Activity>(`${this.api}/user/activities/${activityId}`, {
      activity: { grade, status },
    });
  }

  deleteActivity(activityId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/user/activities/${activityId}`);
  }
}