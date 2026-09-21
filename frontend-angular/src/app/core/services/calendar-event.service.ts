import { Injectable, signal } from '@angular/core';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;      // 'YYYY-MM-DD'
  time: string | null;
}

const KEY = 'trackr-calendar-events';

/**
 * Calendar-only events (the "Other" type) that don't belong to a course.
 * Stored locally on this device, since the backend has no events table yet.
 */
@Injectable({ providedIn: 'root' })
export class CalendarEventService {
  readonly events = signal<CalendarEvent[]>(this.load());

  add(input: { title: string; date: string; time: string | null }): void {
    this.events.set([...this.events(), { id: this.uid(), ...input }]);
    this.persist();
  }

  remove(id: string): void {
    this.events.set(this.events().filter((e) => e.id !== id));
    this.persist();
  }

  private uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  private load(): CalendarEvent[] {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as CalendarEvent[]) : [];
    } catch { return []; }
  }
  private persist(): void {
    try { localStorage.setItem(KEY, JSON.stringify(this.events())); } catch { /* storage blocked */ }
  }
}