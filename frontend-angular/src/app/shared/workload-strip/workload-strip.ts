import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface WorkloadItem {
  id: number;
  name: string;
  code: string;
  color: string;
  weight: number; // 0 when the item has no grading weight
}

export interface WorkloadDay {
  date: Date;
  isToday: boolean;
  items: WorkloadItem[];
}

/** Items without a weight still get a visible sliver so they aren't invisible. */
const MIN_SEGMENT = 4;

@Component({
  selector: 'app-workload-strip',
  imports: [RouterLink],
  templateUrl: './workload-strip.html',
  styleUrl: './workload-strip.css',
})
export class WorkloadStrip {
  readonly days = input.required<WorkloadDay[]>();

  private readonly peak = computed(() =>
    Math.max(1, ...this.days().map((d) => this.dayWeight(d, true))),
  );

  protected readonly columns = computed(() =>
    this.days().map((d) => ({
      ...d,
      label: d.date.toLocaleDateString(undefined, { weekday: 'short' }),
      total: this.dayWeight(d, false),
      segments: d.items.map((it) => ({
        ...it,
        // 92% leaves room for the gaps between stacked segments on the busiest day.
        height: (Math.max(it.weight, MIN_SEGMENT) / this.peak()) * 92,
      })),
    })),
  );

  /**
   * A heads-up when one item carries a big share of a course and isn't due for
   * at least two days — the point where starting early actually helps.
   */
  protected readonly warning = computed(() => {
    let best: { item: WorkloadItem; day: WorkloadDay; idx: number } | null = null;
    this.days().forEach((day, idx) => {
      for (const item of day.items) {
        if (item.weight >= 20 && idx >= 2 && (!best || item.weight > best.item.weight)) {
          best = { item, day, idx };
        }
      }
    });
    if (!best) return null;
    const { item, day, idx } = best as { item: WorkloadItem; day: WorkloadDay; idx: number };
    const start = this.days()[Math.max(0, idx - 2)].date;
    const weekday = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long' });
    return `${weekday(day.date)} carries ${item.weight}% of your ${item.code} grade — start ${item.name} by ${weekday(start)}.`;
  });

  protected readonly legend = computed(() => {
    const seen = new Map<string, string>();
    for (const d of this.days()) for (const it of d.items) if (!seen.has(it.code)) seen.set(it.code, it.color);
    return [...seen].map(([code, color]) => ({ code, color }));
  });

  protected segmentLabel(it: WorkloadItem): string {
    return `${it.code} · ${it.name}${it.weight ? ` · ${it.weight}%` : ''}`;
  }

  private dayWeight(d: WorkloadDay, forScale: boolean): number {
    return d.items.reduce((s, it) => s + (forScale ? Math.max(it.weight, MIN_SEGMENT) : it.weight), 0);
  }
}