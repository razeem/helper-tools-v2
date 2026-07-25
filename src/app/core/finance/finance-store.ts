import { computed, inject, Injectable, Signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { OldRegimeDeductions, TaxRegime } from './tax.model';
import {
  DEFAULT_FINANCE_INPUTS,
  deriveFinance,
  FinanceInputs,
  Goal,
  IdeaRow,
  LineItem,
} from './finance.model';

/** CRUD surface for one list living inside the shared finance model. */
export interface ListOps<T extends { id: string }> {
  items: Signal<T[]>;
  add(item: T): void;
  update(id: string, patch: Partial<T>): void;
  remove(id: string): void;
}

/**
 * The single shared financial state for the whole app.
 *
 * Every value is entered exactly once, in the pillar that owns it; every other
 * pillar reads `derived` (recomputed reactively) instead of re-typing anything.
 * Backed by one IndexedDB collection through the standard StorageService pattern.
 */
@Injectable({ providedIn: 'root' })
export class FinanceStore {
  private readonly store = inject(StorageService).bind<FinanceInputs>({
    key: 'finance',
    version: 1,
    defaults: DEFAULT_FINANCE_INPUTS,
  });

  readonly inputs = this.store.value;
  readonly ready = this.store.ready;

  /** The one source of every derived number (tax, minimum income, surplus, …). */
  readonly derived = computed(() => deriveFinance(this.inputs()));

  // ---- Income pillar ----
  setGross(value: number): void {
    this.store.update((i) => ({ ...i, income: { ...i.income, gross: numeric(value) } }));
  }
  setShortTermSavings(value: number): void {
    this.store.update((i) => ({ ...i, income: { ...i.income, shortTermSavings: numeric(value) } }));
  }
  readonly mustHaveGoals = this.goalList(
    (i) => i.goals.mustHave,
    (i, items) => ({ ...i, goals: { ...i.goals, mustHave: items } }),
  );
  readonly goodToHaveGoals = this.goalList(
    (i) => i.goals.goodToHave,
    (i, items) => ({ ...i, goals: { ...i.goals, goodToHave: items } }),
  );
  readonly ideas = this.list<IdeaRow>(
    (i) => i.ideas,
    (i, items) => ({ ...i, ideas: items }),
  );

  // ---- Spending pillar ----
  readonly needs = this.list<LineItem>(
    (i) => i.spending.needs,
    (i, items) => ({ ...i, spending: { ...i.spending, needs: items } }),
  );
  readonly wants = this.list<LineItem>(
    (i) => i.spending.wants,
    (i, items) => ({ ...i, spending: { ...i.spending, wants: items } }),
  );

  // ---- Future pillars (modelled now; UIs are Coming soon) ----
  readonly loanEmis = this.list<LineItem>(
    (i) => i.loan.emis,
    (i, items) => ({ ...i, loan: { emis: items } }),
  );
  readonly insurancePremiums = this.list<LineItem>(
    (i) => i.insurance.premiums,
    (i, items) => ({ ...i, insurance: { premiums: items } }),
  );
  readonly investingContributions = this.list<LineItem>(
    (i) => i.investing.contributions,
    (i, items) => ({ ...i, investing: { contributions: items } }),
  );

  // ---- Tax pillar ----
  setRegime(regime: TaxRegime): void {
    this.store.update((i) => ({ ...i, tax: { ...i.tax, regime } }));
  }
  setDeduction(key: keyof OldRegimeDeductions, value: number): void {
    this.store.update((i) => ({
      ...i,
      tax: { ...i.tax, deductions: { ...i.tax.deductions, [key]: numeric(value) } },
    }));
  }

  flush(): Promise<void> {
    return this.store.flush();
  }
  reset(): Promise<void> {
    return this.store.reset();
  }

  // ---- internals ----
  private list<T extends { id: string }>(
    select: (i: FinanceInputs) => T[],
    replace: (i: FinanceInputs, items: T[]) => FinanceInputs,
  ): ListOps<T> {
    return {
      items: computed(() => select(this.inputs())),
      add: (item) => this.store.update((i) => replace(i, [...select(i), item])),
      update: (id, patch) =>
        this.store.update((i) =>
          replace(
            i,
            select(i).map((x) => (x.id === id ? { ...x, ...patch } : x)),
          ),
        ),
      remove: (id) =>
        this.store.update((i) =>
          replace(
            i,
            select(i).filter((x) => x.id !== id),
          ),
        ),
    };
  }

  private goalList(
    select: (i: FinanceInputs) => Goal[],
    replace: (i: FinanceInputs, items: Goal[]) => FinanceInputs,
  ): ListOps<Goal> {
    return this.list<Goal>(select, replace);
  }
}

function numeric(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
