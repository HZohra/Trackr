import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CalendarEvent {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null;
}

export interface NewCalendarEvent {
  title: string;
  date: string;
  time: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CalendarEventService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBase;

  readonly events = signal<CalendarEvent[]>([]);

  /**
   * Load all calendar-only events belonging to
   * the currently logged-in Trackr user.
   */
  load(): Observable<CalendarEvent[]> {
    return this.http
      .get<CalendarEvent[]>(
        `${this.api}/api/calendar-events`,
      )
      .pipe(
        tap((events) => {
          this.events.set(events);
        }),
      );
  }

  /**
   * Create a new calendar-only event.
   */
  add(
    input: NewCalendarEvent,
  ): Observable<CalendarEvent> {
    return this.http
      .post<CalendarEvent>(
        `${this.api}/api/calendar-events`,
        input,
      )
      .pipe(
        tap((event) => {
          this.events.update((current) => [
            ...current,
            event,
          ]);
        }),
      );
  }

  /**
   * Delete a calendar-only event.
   */
  remove(
    eventId: number,
  ): Observable<void> {
    return this.http
      .delete<void>(
        `${this.api}/api/calendar-events/${eventId}`,
      )
      .pipe(
        tap(() => {
          this.events.update((current) =>
            current.filter(
              (event) => event.id !== eventId,
            ),
          );
        }),
      );
  }
}