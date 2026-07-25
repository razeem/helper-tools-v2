import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaxConfigStore } from '../../core/finance/tax-config-store';
import { TaxSlab } from '../../core/finance/tax.model';

type Regime = 'old' | 'new';

/**
 * Native editor for the tax rulebook (`TaxConfigStore`). Ships the current-year
 * defaults; every field here overrides them and the whole app recomputes live.
 * "Reset" restores the shipped baseline.
 */
@Component({
  selector: 'app-tax-rules-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="rules">
      <div class="rules__head">
        <div>
          <span class="app-eyebrow">Standard baseline</span>
          <p class="rules__note">
            Shipped default: <strong>{{ config().fyLabel }}</strong
            >. Edit any figure and every pillar recomputes.
          </p>
        </div>
        <button
          mat-stroked-button
          type="button"
          (click)="reset()"
          data-testid="tax-rules-reset"
        >
          <mat-icon>restart_alt</mat-icon>
          Reset
        </button>
      </div>

      <div class="grid">
        <label class="field">
          <span>Cess (%)</span>
          <input
            type="number"
            min="0"
            [value]="cessPercent()"
            (change)="setCess($event)"
            data-testid="cess-rate"
          />
        </label>
        <label class="field">
          <span>80C cap (₹)</span>
          <input
            type="number"
            min="0"
            [value]="config().caps.section80C"
            (change)="setCap('section80C', $event)"
            data-testid="cap-section80C"
          />
        </label>
        <label class="field">
          <span>80D insurance cap (₹)</span>
          <input
            type="number"
            min="0"
            [value]="config().caps.insurance"
            (change)="setCap('insurance', $event)"
            data-testid="cap-insurance"
          />
        </label>
      </div>

      @for (regime of regimes; track regime.key) {
        <section class="regime">
          <h3 class="regime__title">{{ regime.label }}</h3>

          <div class="grid">
            <label class="field">
              <span>Standard deduction (₹)</span>
              <input
                type="number"
                min="0"
                [value]="rules(regime.key).standardDeduction"
                (change)="setStd(regime.key, $event)"
                [attr.data-testid]="'std-' + regime.key"
              />
            </label>
            <label class="field">
              <span>87A rebate limit (₹)</span>
              <input
                type="number"
                min="0"
                [value]="rules(regime.key).rebateLimit"
                (change)="setRebateLimit(regime.key, $event)"
                [attr.data-testid]="'rebate-limit-' + regime.key"
              />
            </label>
            <label class="field">
              <span>87A rebate max (₹)</span>
              <input
                type="number"
                min="0"
                [value]="rules(regime.key).rebateMaxAmount"
                (change)="setRebateMax(regime.key, $event)"
                [attr.data-testid]="'rebate-max-' + regime.key"
              />
            </label>
          </div>

          <table class="slabs">
            <thead>
              <tr>
                <th>From ₹</th>
                <th>Up to ₹</th>
                <th>Rate %</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              @for (slab of rules(regime.key).slabs; track $index) {
                <tr [attr.data-testid]="'slab-' + regime.key">
                  <td>
                    <input
                      type="number"
                      min="0"
                      [value]="slab.minLimit"
                      (change)="editSlab(regime.key, $index, 'minLimit', $event)"
                      [attr.data-testid]="'slab-' + regime.key + '-' + $index + '-min'"
                    />
                  </td>
                  <td>
                    @if (slab.maxLimit === -1) {
                      <span class="slabs__inf">&amp; above</span>
                    } @else {
                      <input
                        type="number"
                        min="0"
                        [value]="slab.maxLimit"
                        (change)="editSlab(regime.key, $index, 'maxLimit', $event)"
                        [attr.data-testid]="'slab-' + regime.key + '-' + $index + '-max'"
                      />
                    }
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      [value]="slab.percent"
                      (change)="editSlab(regime.key, $index, 'percent', $event)"
                      [attr.data-testid]="'slab-' + regime.key + '-' + $index + '-percent'"
                    />
                  </td>
                  <td>
                    <button
                      mat-icon-button
                      type="button"
                      aria-label="Remove slab"
                      (click)="removeSlab(regime.key, $index)"
                      [attr.data-testid]="'slab-' + regime.key + '-remove'"
                    >
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <button
            mat-stroked-button
            type="button"
            (click)="addSlab(regime.key)"
            [attr.data-testid]="'add-slab-' + regime.key"
          >
            <mat-icon>add</mat-icon>
            Add slab
          </button>
        </section>
      }
    </div>
  `,
  styles: `
    .rules {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .rules__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    .rules__note {
      margin: 0.25rem 0 0;
      font-size: 0.82rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.78rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .field input,
    .slabs input {
      width: 100%;
      padding: 0.5rem 0.6rem;
      border-radius: var(--r-control);
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      font: inherit;
      font-variant-numeric: tabular-nums;
    }
    .field input:focus-visible,
    .slabs input:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 1px;
    }
    .regime {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .regime__title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
    }
    .slabs {
      width: 100%;
      border-collapse: collapse;
    }
    .slabs th {
      text-align: left;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
      padding: 0.15rem 0.4rem;
    }
    .slabs td {
      padding: 0.15rem 0.4rem;
    }
    .slabs td:last-child,
    .slabs th:last-child {
      width: 44px;
    }
    .slabs__inf {
      font-size: 0.82rem;
      color: var(--mat-sys-on-surface-variant);
    }
    @media (max-width: 560px) {
      .grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class TaxRulesForm {
  private readonly taxConfig = inject(TaxConfigStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly config = this.taxConfig.config;
  protected readonly cessPercent = computed(() => Math.round(this.config().cessRate * 1000) / 10);
  protected readonly regimes = [
    { key: 'old' as const, label: 'Old regime' },
    { key: 'new' as const, label: 'New regime' },
  ];

  protected rules(regime: Regime) {
    return this.config()[regime];
  }

  private num(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected setCess(event: Event): void {
    this.taxConfig.setCessRate(this.num(event));
  }
  protected setCap(key: 'section80C' | 'insurance', event: Event): void {
    this.taxConfig.setCap(key, this.num(event));
  }
  protected setStd(regime: Regime, event: Event): void {
    this.taxConfig.setStandardDeduction(regime, this.num(event));
  }
  protected setRebateLimit(regime: Regime, event: Event): void {
    this.taxConfig.setRebate(regime, { limit: this.num(event) });
  }
  protected setRebateMax(regime: Regime, event: Event): void {
    this.taxConfig.setRebate(regime, { maxAmount: this.num(event) });
  }
  protected editSlab(regime: Regime, index: number, field: keyof TaxSlab, event: Event): void {
    this.taxConfig.updateSlab(regime, index, { [field]: this.num(event) });
  }
  protected addSlab(regime: Regime): void {
    this.taxConfig.addSlab(regime);
  }
  protected removeSlab(regime: Regime, index: number): void {
    this.taxConfig.removeSlab(regime, index);
  }

  protected async reset(): Promise<void> {
    await this.taxConfig.reset();
    this.snackBar.open('Tax rules reset to defaults', 'Dismiss', { duration: 2000 });
  }
}
