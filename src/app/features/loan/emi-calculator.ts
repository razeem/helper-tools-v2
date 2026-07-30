import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  WritableSignal,
} from '@angular/core';
import { InrPipe } from '../../shared/inr-pipe';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { calculateEmi } from '../../core/finance/emi.model';
import { SectionCard } from '../../shared/ui/section-card/section-card';

/** Slider bounds for each input. */
const PRINCIPAL = { min: 100_000, max: 20_000_000, step: 50_000 };
const RATE = { min: 0, max: 20, step: 0.1 };
const TENURE = { min: 1, max: 30, step: 1 };

@Component({
  selector: 'app-emi-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InrPipe, FormsModule, MatSliderModule, MatExpansionModule, MatTableModule, SectionCard],
  // Slider + donut styling is shared with the other calculators — see the
  // `.app-slider` / `.app-donut-seg` utilities in styles.scss.
  templateUrl: './emi-calculator.html',
})
export class EmiCalculator {
  protected readonly PRINCIPAL = PRINCIPAL;
  protected readonly RATE = RATE;
  protected readonly TENURE = TENURE;

  // Scratch inputs — local signals, not persisted (a calculator is a scratchpad).
  protected readonly principal = signal(1_000_000);
  protected readonly annualRatePct = signal(5.5);
  protected readonly tenureYears = signal(3);

  protected readonly tenureMonths = computed(() => Math.round(this.tenureYears() * 12));

  protected readonly result = computed(() =>
    calculateEmi({
      principal: this.principal(),
      annualRatePct: this.annualRatePct(),
      tenureMonths: this.tenureMonths(),
    }),
  );

  protected readonly hasResult = computed(() => this.result().emi > 0);

  /** Donut geometry: loan (principal) vs interest as arcs of one ring. */
  protected readonly donut = computed(() => {
    const r = this.result();
    const total = r.totalPayment || 1;
    const c = 2 * Math.PI * 42; // r = 42 within a 100×100 viewBox
    const loanLen = (this.principal() / total) * c;
    return { c, loanLen, interestLen: c - loanLen };
  });

  protected readonly monthColumns = ['month', 'principal', 'interest', 'emi', 'balance'] as const;

  protected setNumber(sig: WritableSignal<number>, value: string | number): void {
    sig.set(typeof value === 'number' ? value : Number(value) || 0);
  }
}
