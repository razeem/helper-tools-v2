import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { InrPipe } from '../../shared/inr-pipe';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FinanceStore } from '../../core/finance/finance-store';
import { EMERGENCY_TIERS, EmergencyMultiplier } from '../../core/finance/finance.model';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { InlinePrompt } from '../../shared/ui/inline-prompt/inline-prompt';

@Component({
  selector: 'app-saving',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InrPipe, RouterLink, MatIconModule, PageHeader, SectionCard, StatTile, InlinePrompt],
  templateUrl: './saving.html',
  styles: `
    .tiers {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.85rem;
    }
    .ef-result {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
      margin-top: 1.15rem;
      padding: 1.25rem 1.4rem;
      border-radius: var(--r-card);
      background: var(
        --gradient,
        linear-gradient(120deg, var(--accent-1, #6366f1), var(--accent-2, #22d3ee))
      );
      color: #fff;
    }
    .ef-result__text {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .ef-result__label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .ef-result__formula {
      font-size: 0.9rem;
      opacity: 0.9;
    }
    .ef-result__amount {
      font-size: 2.4rem;
      font-weight: 800;
      line-height: 1;
    }
    @media (max-width: 480px) {
      .ef-result__amount {
        font-size: 1.9rem;
      }
    }
    .tier {
      display: flex;
      align-items: stretch;
      gap: 0.75rem;
      padding: 1rem 1.1rem;
      text-align: left;
      border-radius: var(--r-card);
      background: var(--mat-sys-surface-container);
      border: 2px solid var(--mat-sys-outline-variant);
      cursor: pointer;
      transition: var(--transition, all 0.2s ease);
    }
    .tier:hover {
      border-color: var(--mat-sys-outline);
    }
    .tier--active {
      border-color: var(--mat-sys-primary);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .tier__questions {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.4rem;
      flex: 1 1 auto;
    }
    .tier__q {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .tier__q mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .tier__q--yes mat-icon {
      color: #17c07a;
    }
    .tier__q--no {
      opacity: 0.5;
    }
    .tier__badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.1rem;
      min-width: 84px;
      padding: 0.5rem;
      border-radius: var(--r-control);
      background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .tier--active .tier__badge {
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
    }
    .tier__mult {
      font-size: 1.7rem;
      font-weight: 800;
      line-height: 1;
    }
    .tier__badge small {
      font-size: 0.66rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-align: center;
      opacity: 0.7;
    }
    .breakdown {
      list-style: none;
      margin: 1.15rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
    .breakdown__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.7rem 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .breakdown__label {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      color: inherit;
      text-decoration: none;
    }
    a.breakdown__label:hover {
      color: var(--mat-sys-primary);
    }
    .breakdown__label small {
      font-size: 0.74rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .breakdown__value {
      font-weight: 600;
    }
    .breakdown__row--total {
      border-bottom: 0;
      margin-top: 0.15rem;
      font-weight: 700;
    }
    .breakdown__row--total .breakdown__value {
      font-size: 1.15rem;
      color: var(--mat-sys-primary);
    }
  `,
})
export class Saving {
  private readonly store = inject(FinanceStore);
  protected readonly derived = this.store.derived;
  protected readonly emergencyMultiplier = this.store.emergencyMultiplier;

  /** The three reference profiles from the infographic (3× / 6× / 12×). */
  protected readonly tiers = EMERGENCY_TIERS;

  /** The three questions, in the order shown on each tier card. */
  protected readonly questions = [
    { key: 'stableJob', label: 'Stable Job' },
    { key: 'stableIncome', label: 'Stable Income' },
    { key: 'dependents', label: 'Have Dependents' },
  ] as const;

  /** The pieces that make up the minimum monthly (essential) expense. */
  protected readonly breakdown = computed(() => {
    const d = this.derived();
    return [
      // `totalNeeds` already includes loan EMIs, so split them back out for display.
      {
        label: 'Needs',
        hint: 'Essential spending',
        link: '/spending',
        value: d.totalNeeds - d.totalLoanEmis,
      },
      { label: 'Loan EMIs', hint: 'Repayments', link: '/loan', value: d.totalLoanEmis },
      {
        label: 'Mandatory investments',
        hint: 'EPF / NPS',
        link: '/investing',
        value: d.mandatoryInvestments,
      },
    ];
  });

  protected select(multiplier: EmergencyMultiplier): void {
    this.store.setEmergencyMultiplier(multiplier);
  }
}
