import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AssumptionsStore,
  DEFAULT_ASSUMPTIONS,
  INFLATION_RANGE,
} from '../../core/finance/assumptions-store';

/**
 * Editor for the forward-looking assumptions (`AssumptionsStore`). Currently one
 * figure — the inflation rate — which every real-terms calculation reads: the
 * Investing pillar's Inflation Adjuster and the NPS projection both recompute
 * live when it changes.
 */
@Component({
  selector: 'app-assumptions-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="flex flex-col gap-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="app-eyebrow">Standard baseline</span>
          <p class="m-0 mt-1 text-[0.82rem] text-[var(--mat-sys-on-surface-variant)]">
            Shipped default: <strong>{{ DEFAULTS.inflationRatePct }}% inflation</strong>. Edit it
            and every real-terms figure recomputes.
          </p>
        </div>
        <button mat-stroked-button type="button" (click)="reset()" data-testid="assumptions-reset">
          <mat-icon>restart_alt</mat-icon>
          Reset
        </button>
      </div>

      <label class="flex flex-col gap-1.5 text-[0.78rem] text-[var(--mat-sys-on-surface-variant)]">
        <span>Inflation rate (% per year)</span>
        <input
          class="w-full px-2.5 py-2 rounded-[var(--r-control)] border border-[var(--mat-sys-outline-variant)] bg-[var(--mat-sys-surface)] text-[var(--mat-sys-on-surface)] font-[inherit] app-num focus-visible:outline-2 focus-visible:outline-[var(--mat-sys-primary)]"
          type="number"
          [min]="RANGE.min"
          [max]="RANGE.max"
          [step]="RANGE.step"
          [value]="rate()"
          (change)="setRate($event)"
          data-testid="assumption-inflation"
        />
        <span>
          Used by the Investing pillar's Inflation Adjuster and NPS calculator to convert future
          rupees into today's money. India's long-run CPI print sits around 6%.
        </span>
      </label>
    </div>
  `,
})
export class AssumptionsForm {
  private readonly assumptions = inject(AssumptionsStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly DEFAULTS = DEFAULT_ASSUMPTIONS;
  protected readonly RANGE = INFLATION_RANGE;
  protected readonly rate = this.assumptions.inflationRatePct;

  protected setRate(event: Event): void {
    this.assumptions.setInflationRatePct(Number((event.target as HTMLInputElement).value));
  }

  protected async reset(): Promise<void> {
    await this.assumptions.reset();
    this.snackBar.open('Assumptions reset to defaults', 'Dismiss', { duration: 2000 });
  }
}
