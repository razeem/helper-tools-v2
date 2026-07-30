import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { InrPipe } from '../../shared/inr-pipe';
import { AssumptionsStore, INFLATION_RANGE } from '../../core/finance/assumptions-store';
import { FinanceStore } from '../../core/finance/finance-store';
import { sumLineItemsMonthly } from '../../core/finance/finance.model';
import {
  calculateNps,
  MIN_ANNUITY_SHARE_PCT,
  NPS_RETIREMENT_AGE,
} from '../../core/finance/nps.model';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { SliderField } from '../../shared/ui/slider-field/slider-field';

/** Slider bounds for each input. */
const CONTRIBUTION = { min: 500, max: 200_000, step: 500 };
const CURRENT_AGE = { min: 18, max: 69, step: 1 };
const RETIREMENT_AGE = { min: 40, max: 75, step: 1 };
const RETURN = { min: 4, max: 15, step: 0.1 };
const ANNUITY_SHARE = { min: MIN_ANNUITY_SHARE_PCT, max: 100, step: 5 };
const ANNUITY_RATE = { min: 3, max: 12, step: 0.1 };

/** Matches an NPS line item declared in the Investing pillar. */
const NPS_NAME = /\bnps\b/i;

/**
 * NPS Calculator — the loan-calculator shape (sliders → headline figures →
 * schedule), with two **automated** inputs on top:
 *
 *  - the monthly contribution is seeded from the NPS line items already declared
 *    in this pillar (shared model — never re-typed), and
 *  - the inflation rate comes from the app-wide assumption (Settings →
 *    Assumptions), which drives the today's-money view of the payout.
 */
@Component({
  selector: 'app-nps-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InrPipe, DecimalPipe, SectionCard, StatTile, SliderField],
  templateUrl: './nps-calculator.html',
})
export class NpsCalculator {
  private readonly assumptions = inject(AssumptionsStore);
  private readonly finance = inject(FinanceStore);

  protected readonly CONTRIBUTION = CONTRIBUTION;
  protected readonly CURRENT_AGE = CURRENT_AGE;
  protected readonly RETIREMENT_AGE = RETIREMENT_AGE;
  protected readonly RETURN = RETURN;
  protected readonly ANNUITY_SHARE = ANNUITY_SHARE;
  protected readonly ANNUITY_RATE = ANNUITY_RATE;
  protected readonly RATE = INFLATION_RANGE;
  protected readonly MIN_ANNUITY_SHARE_PCT = MIN_ANNUITY_SHARE_PCT;

  // Scratch inputs — local signals, not persisted (a calculator is a scratchpad).
  protected readonly monthlyContribution = signal(5_000);
  protected readonly currentAge = signal(30);
  protected readonly retirementAge = signal(NPS_RETIREMENT_AGE);
  protected readonly expectedReturnPct = signal(10);
  protected readonly annuitySharePct = signal(MIN_ANNUITY_SHARE_PCT);
  protected readonly annuityRatePct = signal(6);

  /** Shared assumption, persisted app-wide. */
  protected readonly inflationRatePct = this.assumptions.inflationRatePct;

  /** What this pillar already declares as NPS, per month — the automated seed. */
  protected readonly declaredNps = computed(() => {
    const inputs = this.finance.inputs().investing;
    const items = [...inputs.mandatory, ...inputs.voluntary].filter((i) => NPS_NAME.test(i.type));
    return Math.round(sumLineItemsMonthly(items));
  });

  protected readonly result = computed(() =>
    calculateNps({
      monthlyContribution: this.monthlyContribution(),
      currentAge: this.currentAge(),
      retirementAge: this.retirementAge(),
      expectedReturnPct: this.expectedReturnPct(),
      annuitySharePct: this.annuitySharePct(),
      annuityRatePct: this.annuityRatePct(),
      inflationRatePct: this.inflationRatePct(),
    }),
  );

  protected readonly hasResult = computed(() => this.result().corpus > 0);

  /** Donut geometry: what you put in vs what it grew to. */
  protected readonly donut = computed(() => {
    const r = this.result();
    const total = r.corpus || 1;
    const c = 2 * Math.PI * 42; // r = 42 within a 100×100 viewBox
    const investedLen = (r.totalInvested / total) * c;
    return { c, investedLen, growthLen: c - investedLen };
  });

  constructor() {
    // Seed the contribution from the declared NPS items once the shared model
    // has hydrated — after that the slider is the user's scratchpad.
    const seed = effect(() => {
      if (!this.finance.ready()) {
        return;
      }
      const declared = this.declaredNps();
      if (declared > 0) {
        this.monthlyContribution.set(declared);
      }
      seed.destroy();
    });
  }

  /** Re-sync the slider with the declared NPS contribution. */
  protected useDeclared(): void {
    const declared = this.declaredNps();
    if (declared > 0) {
      this.monthlyContribution.set(declared);
    }
  }

  protected setInflationRate(percent: number): void {
    this.assumptions.setInflationRatePct(percent);
  }
}
