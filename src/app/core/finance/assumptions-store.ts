import { computed, inject, Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';

/**
 * Forward-looking assumptions that are not *facts* about the user's finances but
 * still need to be entered once and shared: today, the inflation rate every
 * real-terms figure is discounted with (Inflation Adjuster, NPS projection).
 */
export interface Assumptions {
  /** Assumed annual inflation, as a percentage (e.g. 6 for 6%). */
  inflationRatePct: number;
}

/** India's long-run headline CPI print sits around 6% — the shipped baseline. */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflationRatePct: 6,
};

/** Bounds shared by the settings field and the calculator sliders. */
export const INFLATION_RANGE = { min: 0, max: 15, step: 0.1 };

/**
 * The editable assumptions rulebook — same shape of idea as `TaxConfigStore`:
 * ships a sensible default, the user can override it in Settings → Assumptions,
 * and every calculator that reads it recomputes live.
 */
@Injectable({ providedIn: 'root' })
export class AssumptionsStore {
  private readonly store = inject(StorageService).bind<Assumptions>({
    key: 'assumptions',
    version: 1,
    defaults: DEFAULT_ASSUMPTIONS,
  });

  readonly value = this.store.value;
  readonly ready = this.store.ready;
  readonly inflationRatePct = computed(() => this.value().inflationRatePct);

  setInflationRatePct(percent: number): void {
    this.store.patch({ inflationRatePct: clampRate(percent) });
  }

  flush(): Promise<void> {
    return this.store.flush();
  }

  /** Restore the shipped baseline. */
  async reset(): Promise<void> {
    await this.store.reset();
  }
}

function clampRate(percent: number): number {
  const n = Number(percent);
  if (!Number.isFinite(n)) return DEFAULT_ASSUMPTIONS.inflationRatePct;
  return Math.min(INFLATION_RANGE.max, Math.max(INFLATION_RANGE.min, n));
}
