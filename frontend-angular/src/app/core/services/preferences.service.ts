import { Injectable, signal } from '@angular/core';

const SHOW_ARCHIVED_KEY = 'trackr-show-archived';

/** Small per-device UI preferences that aren't theme or GPA. */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  readonly showArchivedCourses = signal<boolean>(this.load(SHOW_ARCHIVED_KEY));

  setShowArchivedCourses(value: boolean): void {
    this.showArchivedCourses.set(value);
    try { localStorage.setItem(SHOW_ARCHIVED_KEY, value ? '1' : '0'); } catch { /* storage blocked */ }
  }

  private load(key: string): boolean {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  }
}