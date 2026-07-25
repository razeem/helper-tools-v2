import { computed, inject, Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { DEFAULT_TAX_CONFIG, RegimeRules, TaxConfig, TaxSlab } from './tax.model';

/**
 * The editable tax rulebook. Ships the current-year defaults (FY 2025-26) as the
 * standard baseline; each user can override any figure and the whole tax engine
 * (`FinanceStore.derived`, the Tax pillar, the comparer) recomputes from it.
 * `reset()` restores the shipped defaults.
 */
@Injectable({ providedIn: 'root' })
export class TaxConfigStore {
  private readonly store = inject(StorageService).bind<TaxConfig>({
    key: 'tax-config',
    version: 1,
    defaults: DEFAULT_TAX_CONFIG,
  });

  readonly config = this.store.value;
  readonly ready = this.store.ready;
  readonly fyLabel = computed(() => this.config().fyLabel);

  setStandardDeduction(regime: 'old' | 'new', value: number): void {
    this.patchRules(regime, { standardDeduction: nonNeg(value) });
  }

  setRebate(regime: 'old' | 'new', patch: { limit?: number; maxAmount?: number }): void {
    this.patchRules(regime, {
      ...(patch.limit !== undefined ? { rebateLimit: nonNeg(patch.limit) } : {}),
      ...(patch.maxAmount !== undefined ? { rebateMaxAmount: nonNeg(patch.maxAmount) } : {}),
    });
  }

  setCessRate(percent: number): void {
    this.store.patch({ cessRate: nonNeg(percent) / 100 });
  }

  setCap(key: 'section80C' | 'insurance', value: number): void {
    this.store.update((c) => ({ ...c, caps: { ...c.caps, [key]: nonNeg(value) } }));
  }

  updateSlab(regime: 'old' | 'new', index: number, patch: Partial<TaxSlab>): void {
    this.store.update((c) => {
      const rules = c[regime];
      const slabs = rules.slabs.map((slab, i) =>
        i === index
          ? {
              minLimit: nonNeg(patch.minLimit ?? slab.minLimit),
              maxLimit: patch.maxLimit ?? slab.maxLimit, // -1 allowed (open-ended)
              percent: nonNeg(patch.percent ?? slab.percent),
            }
          : slab,
      );
      return { ...c, [regime]: { ...rules, slabs } };
    });
  }

  addSlab(regime: 'old' | 'new'): void {
    this.store.update((c) => {
      const rules = c[regime];
      const last = rules.slabs[rules.slabs.length - 1];
      const newMin = (last ? last.minLimit : 0) + 100_000;
      const slabs = chainMaxLimits([
        ...rules.slabs,
        { minLimit: newMin, maxLimit: -1, percent: last ? last.percent : 0 },
      ]);
      return { ...c, [regime]: { ...rules, slabs } };
    });
  }

  removeSlab(regime: 'old' | 'new', index: number): void {
    this.store.update((c) => {
      const rules = c[regime];
      if (rules.slabs.length <= 1) {
        return c; // always keep at least one slab
      }
      const slabs = chainMaxLimits(rules.slabs.filter((_, i) => i !== index));
      return { ...c, [regime]: { ...rules, slabs } };
    });
  }

  flush(): Promise<void> {
    return this.store.flush();
  }

  /** Restore the shipped current-year defaults. */
  async reset(): Promise<void> {
    await this.store.reset();
  }

  private patchRules(regime: 'old' | 'new', patch: Partial<RegimeRules>): void {
    this.store.update((c) => ({ ...c, [regime]: { ...c[regime], ...patch } }));
  }
}

function nonNeg(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Keep slab ranges contiguous after add/remove: each slab's upper bound is the
 * next slab's lower bound, and the last stays open-ended (`-1`). Prevents gaps
 * or a double-counted open-ended top slab.
 */
function chainMaxLimits(slabs: TaxSlab[]): TaxSlab[] {
  return slabs.map((slab, i) => ({
    ...slab,
    maxLimit: i < slabs.length - 1 ? slabs[i + 1].minLimit : -1,
  }));
}
