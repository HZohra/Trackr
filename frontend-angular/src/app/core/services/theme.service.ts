import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
export type AccentId =
  | 'indigo' | 'violet' | 'sky' | 'teal'
  | 'emerald' | 'amber' | 'rose' | 'strawberry'
  | 'custom';

interface Shades { brand: string; ink: string; soft: string; }
export interface Accent { id: AccentId; label: string; light: Shades; dark: Shades; }

const THEME_KEY = 'trackr-theme';
const ACCENT_KEY = 'trackr-accent';
const HUE_KEY = 'trackr-accent-hue';

/** Preset accents: each has hand-tuned light + dark shades. */
export const ACCENTS: readonly Accent[] = [
  { id: 'indigo',     label: 'Indigo',     light: { brand: '#4F46E5', ink: '#4338CA', soft: '#EEF2FF' }, dark: { brand: '#6366F1', ink: '#A5B4FC', soft: '#24224A' } },
  { id: 'violet',     label: 'Violet',     light: { brand: '#7C3AED', ink: '#6D28D9', soft: '#F3E8FF' }, dark: { brand: '#8B5CF6', ink: '#C4B5FD', soft: '#2A1E45' } },
  { id: 'sky',        label: 'Ocean',      light: { brand: '#0284C7', ink: '#0369A1', soft: '#E0F2FE' }, dark: { brand: '#38BDF8', ink: '#7DD3FC', soft: '#0C2A3A' } },
  { id: 'teal',       label: 'Teal',       light: { brand: '#0D9488', ink: '#0F766E', soft: '#CCFBF1' }, dark: { brand: '#2DD4BF', ink: '#5EEAD4', soft: '#0C2E2A' } },
  { id: 'emerald',    label: 'Emerald',    light: { brand: '#059669', ink: '#047857', soft: '#D1FAE5' }, dark: { brand: '#34D399', ink: '#6EE7B7', soft: '#0C2E22' } },
  { id: 'amber',      label: 'Amber',      light: { brand: '#D97706', ink: '#B45309', soft: '#FEF3C7' }, dark: { brand: '#FBBF24', ink: '#FCD34D', soft: '#33260C' } },
  { id: 'rose',       label: 'Rose',       light: { brand: '#E11D48', ink: '#BE123C', soft: '#FFE4E6' }, dark: { brand: '#FB7185', ink: '#FDA4AF', soft: '#3A1720' } },
  { id: 'strawberry', label: 'Strawberry', light: { brand: '#EF4358', ink: '#C42640', soft: '#FDE7EA' }, dark: { brand: '#FF5568', ink: '#FF8592', soft: '#3A1D22' } },
];

/**
 * Owns light/dark AND the accent colour (a preset, or a custom hue).
 * Presets look their shades up; 'custom' derives them from a single hue so any
 * pick stays readable in both themes. All choices persist per device.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initialTheme());
  readonly accent = signal<AccentId>(this.initialAccent());
  readonly customHue = signal<number>(this.initialHue()); // 0..359
  readonly accents = ACCENTS;

  constructor() {
    const savedTheme = this.savedTheme();
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-accent', this.accent());
    this.applyAccent();
  }

  toggle(): void { this.setTheme(this.theme() === 'dark' ? 'light' : 'dark'); }

  setTheme(next: Theme): void {
    this.theme.set(next);
    document.documentElement.setAttribute('data-theme', next);
    this.store(THEME_KEY, next);
    this.applyAccent(); // shades differ between light and dark
  }

  setAccent(id: AccentId): void {
    this.accent.set(id);
    document.documentElement.setAttribute('data-accent', id);
    this.store(ACCENT_KEY, id);
    this.applyAccent();
  }

  /** Pick a custom accent by hue (0..359). Switches the active accent to 'custom'. */
  setCustomHue(hue: number): void {
    const h = Math.max(0, Math.min(359, Math.round(hue)));
    this.customHue.set(h);
    this.accent.set('custom');
    document.documentElement.setAttribute('data-accent', 'custom');
    this.store(HUE_KEY, String(h));
    this.store(ACCENT_KEY, 'custom');
    this.applyAccent();
  }

  /** Shades for an accent under the current theme — used to paint the app and the swatches. */
  shadesFor(id: AccentId): Shades {
    if (id === 'custom') return this.customShades(this.theme(), this.customHue());
    const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0];
    return this.theme() === 'dark' ? a.dark : a.light;
  }

  /** Build a readable accent from one hue, tuned per theme. */
  private customShades(theme: Theme, hue: number): Shades {
    if (theme === 'dark') {
      return { brand: `hsl(${hue} 78% 62%)`, ink: `hsl(${hue} 85% 78%)`, soft: `hsl(${hue} 45% 18%)` };
    }
    return { brand: `hsl(${hue} 72% 52%)`, ink: `hsl(${hue} 68% 42%)`, soft: `hsl(${hue} 85% 95%)` };
  }

  /** Write the active accent's colours onto <html> so the whole app repaints. */
  private applyAccent(): void {
    const s = this.shadesFor(this.accent());
    const root = document.documentElement.style;
    root.setProperty('--brand', s.brand);
    root.setProperty('--brand-ink', s.ink);
    root.setProperty('--brand-soft', s.soft);
  }

  private savedTheme(): Theme | null {
    const v = this.read(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  }

  private initialTheme(): Theme {
    const saved = this.savedTheme();
    if (saved) return saved;
    const prefersDark =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private initialAccent(): AccentId {
    const v = this.read(ACCENT_KEY);
    if (v === 'custom') return 'custom';
    const found = ACCENTS.find((a) => a.id === v);
    return found ? found.id : 'indigo';
  }

  private initialHue(): number {
    const v = Number(this.read(HUE_KEY));
    return Number.isFinite(v) && v >= 0 && v <= 359 ? Math.round(v) : 265;
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private store(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* storage blocked; still works this session */ }
  }
}