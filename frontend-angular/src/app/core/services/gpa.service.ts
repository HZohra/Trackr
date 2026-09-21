import { Injectable, computed, signal } from '@angular/core';
import {
  GpaScaleId, GpaScale, GradeBand, GradePoint,
  GPA_SCALES, scaleById, gradePoint, defaultCustomBands, makeCustomScale,
} from '../gpa';

const SCALE_KEY = 'trackr-gpa-scale';
const CUSTOM_KEY = 'trackr-gpa-custom';

/** Owns the chosen GPA scale (including an editable custom one) and converts percentages. */
@Injectable({ providedIn: 'root' })
export class GpaService {
  readonly scaleId = signal<GpaScaleId>(this.initialScale());
  readonly customBands = signal<GradeBand[]>(this.initialCustom());

  /** Options for the Settings selector (built-ins + Custom). */
  readonly scaleOptions: { id: GpaScaleId; label: string }[] = [
    ...GPA_SCALES.map((s) => ({ id: s.id, label: s.label })),
    { id: 'custom', label: 'Custom' },
  ];

  readonly scale = computed<GpaScale>(() =>
    this.scaleId() === 'custom' ? makeCustomScale(this.customBands()) : scaleById(this.scaleId()),
  );

  /** False for percentage-only scales (e.g. McGill) that have no GPA number. */
  readonly hasGpa = computed(() => this.scale().max != null);

  setScale(id: GpaScaleId): void {
    this.scaleId.set(id);
    this.store(SCALE_KEY, id);
  }

  gradePoint(percent: number): GradePoint {
    return gradePoint(percent, this.scale());
  }

  // --- custom band editing -------------------------------------------------

  updateBand(index: number, patch: Partial<GradeBand>): void {
    this.customBands.set(this.customBands().map((b, i) => (i === index ? { ...b, ...patch } : b)));
    this.persistCustom();
  }

  addBand(): void {
    this.customBands.set([...this.customBands(), { min: 0, letter: '', points: 0 }]);
    this.persistCustom();
  }

  removeBand(index: number): void {
    this.customBands.set(this.customBands().filter((_, i) => i !== index));
    this.persistCustom();
  }

  resetCustom(): void {
    this.customBands.set(defaultCustomBands());
    this.persistCustom();
  }

  // --- persistence ---------------------------------------------------------

  private initialScale(): GpaScaleId {
    const v = this.read(SCALE_KEY);
    if (v === 'custom') return 'custom';
    const found = GPA_SCALES.find((s) => s.id === v);
    return found ? found.id : 'gpa4';
  }

  private initialCustom(): GradeBand[] {
    const raw = this.read(CUSTOM_KEY);
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(this.isBand)) return parsed as GradeBand[];
      } catch { /* fall through to default */ }
    }
    return defaultCustomBands();
  }

  private isBand(b: unknown): b is GradeBand {
    const x = b as GradeBand;
    return !!x && typeof x.letter === 'string' && typeof x.min === 'number'
      && (x.points === null || typeof x.points === 'number');
  }

  private persistCustom(): void {
    this.store(CUSTOM_KEY, JSON.stringify(this.customBands()));
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  private store(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
  }
}