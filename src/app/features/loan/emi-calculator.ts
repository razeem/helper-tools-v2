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
  templateUrl: './emi-calculator.html',
  styles: `
    /* Smooth the donut arcs as amounts change on the fly. */
    .donut-seg {
      transition:
        stroke-dasharray 0.5s cubic-bezier(0.4, 0, 0.2, 1),
        stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Slider: full-width span + higher-contrast track/handle (light & dark).
       The class selector out-specifies Material's global .mat-mdc-slider rule,
       and the --mat-slider-* tokens cascade into the internals. */
    .emi-slider {
      width: 100%;
      margin: 0;
      --mat-slider-active-track-height: 6px;
      --mat-slider-inactive-track-height: 6px;
      --mat-slider-handle-width: 22px;
      --mat-slider-handle-height: 22px;
      --mat-slider-inactive-track-color: var(--mat-sys-outline);
    }
    /* The inactive track's 0.24 opacity is hardcoded in Material — lift it so
       the unfilled remainder is clearly visible against the card. */
    ::ng-deep .emi-slider .mdc-slider__track--inactive {
      opacity: 0.55;
    }
  `,
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
