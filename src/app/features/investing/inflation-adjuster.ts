import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { InrPipe } from '../../shared/inr-pipe';
import { AssumptionsStore, INFLATION_RANGE } from '../../core/finance/assumptions-store';
import { projectInflation } from '../../core/finance/inflation.model';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { SliderField } from '../../shared/ui/slider-field/slider-field';

/** Slider bounds. */
const AMOUNT = { min: 10_000, max: 20_000_000, step: 10_000 };
/** How far ahead the forecast table runs. */
const HORIZON_YEARS = 40;

/**
 * Inflation Adjuster — the "what will this actually be worth?" calculator.
 *
 * The inflation rate is **not** a scratch input: it is the app-wide assumption
 * from `AssumptionsStore` (Settings → Assumptions), so editing it here updates
 * the NPS projection too. Amount and target year are local scratch state.
 */
@Component({
  selector: 'app-inflation-adjuster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InrPipe, DecimalPipe, SectionCard, StatTile, SliderField],
  templateUrl: './inflation-adjuster.html',
})
export class InflationAdjuster {
  private readonly assumptions = inject(AssumptionsStore);

  protected readonly AMOUNT = AMOUNT;
  protected readonly RATE = INFLATION_RANGE;

  /** Calendar anchor for the year picker — recomputed on the client on hydration. */
  protected readonly baseYear = new Date().getFullYear();
  protected readonly YEAR = { min: this.baseYear, max: this.baseYear + HORIZON_YEARS, step: 1 };

  // Scratch inputs — local signals, not persisted (a calculator is a scratchpad).
  protected readonly amount = signal(1_000_000);
  protected readonly targetYear = signal(this.baseYear + 20);

  /** Shared assumption, persisted app-wide. */
  protected readonly rate = this.assumptions.inflationRatePct;

  protected readonly yearsAhead = computed(() =>
    Math.min(HORIZON_YEARS, Math.max(0, Math.round(this.targetYear()) - this.baseYear)),
  );

  /** The whole horizon is projected once; the selected year indexes into it. */
  protected readonly forecast = computed(() =>
    projectInflation({
      amount: this.amount(),
      annualRatePct: this.rate(),
      years: HORIZON_YEARS,
    }),
  );

  protected readonly selected = computed(() => this.forecast().rows[this.yearsAhead()]);

  /** Share of today's purchasing power that survives to the selected year. */
  protected readonly powerLeftPct = computed(() => 100 - this.selected().erosionPct);

  /** How many times more expensive the selected year is than today. */
  protected readonly selectedFactor = computed(() =>
    Math.pow(1 + this.rate() / 100, this.yearsAhead()),
  );

  protected setRate(percent: number): void {
    this.assumptions.setInflationRatePct(percent);
  }
}
