import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FinanceStore } from '../../core/finance/finance-store';
import { PILLARS } from '../../app.routes';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { PillarCard } from '../../shared/ui/pillar-card/pillar-card';
import { SectionCard } from '../../shared/ui/section-card/section-card';

interface Segment {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, PageHeader, StatTile, PillarCard, SectionCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly store = inject(FinanceStore);

  protected readonly derived = this.store.derived;
  protected readonly pillars = PILLARS.filter((p) => p.path !== 'dashboard');

  /** Where gross income goes — segments sized against gross for the allocation bar. */
  protected readonly allocation = computed<{ total: number; segments: Segment[] }>(() => {
    const d = this.derived();
    const segments: Segment[] = [
      { label: 'Needs', value: d.totalNeeds, color: '#3b6ef5' },
      { label: 'Wants', value: d.totalWants, color: '#7c5cff' },
      { label: 'Savings', value: d.shortTermSavings, color: '#17c07a' },
      { label: 'Investments', value: d.totalInvestments, color: '#00b4b4' },
      { label: 'Insurance', value: d.totalInsurance, color: '#f2a23c' },
      { label: 'Tax', value: d.taxPayable, color: '#f04452' },
    ].filter((s) => s.value > 0);
    return { total: Math.max(d.gross, 1), segments };
  });

  protected pillarValue(path: string): string {
    const d = this.derived();
    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    switch (path) {
      case 'income':
        return fmt(d.netIncome);
      case 'spending':
        return fmt(d.totalNeeds + d.totalWants);
      case 'tax':
        return fmt(d.taxPayable);
      default:
        return '';
    }
  }

  protected segmentWidth(value: number): string {
    return `${(value / this.allocation().total) * 100}%`;
  }
}
