import { Injectable, signal } from '@angular/core';

const KEY = 'trackr-snoozed';
const FOREVER = Number.MAX_SAFE_INTEGER;

/**
 * Hides activities from the dashboard's "next move" and past-due lists,
 * either for a while (snooze) or for good (dismiss).
 *
 * Client-side for now (same pattern as GpaService/ThemeService). If snoozes
 * should follow the user across devices, move this to a `snoozed_until`
 * column on activities.
 */
@Injectable({ providedIn: 'root' })
export class SnoozeService {
  private readonly until = signal<Record<number, number>>(this.load());

  snooze(activityId: number, hours = 24): void {
    this.set(activityId, Date.now() + hours * 3_600_000);
  }

  dismiss(activityId: number): void {
    this.set(activityId, FOREVER);
  }

  isHidden(activityId: number, now = Date.now()): boolean {
    return (this.until()[activityId] ?? 0) > now;
  }

  /** Read inside computed() so views re-evaluate when snoozes change. */
  readonly version = this.until.asReadonly();

  private set(activityId: number, until: number): void {
    this.until.update((m) => ({ ...m, [activityId]: until }));
    try { localStorage.setItem(KEY, JSON.stringify(this.until())); } catch { /* storage blocked */ }
  }

  private load(): Record<number, number> {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
      const now = Date.now();
      // Drop expired snoozes so storage doesn't grow forever.
      return Object.fromEntries(
        Object.entries(raw).filter(([, t]) => typeof t === 'number' && t > now),
      ) as Record<number, number>;
    } catch {
      return {};
    }
  }
}