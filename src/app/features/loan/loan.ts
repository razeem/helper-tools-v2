import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FinanceStore } from '../../core/finance/finance-store';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { LineItemList } from '../../shared/ui/line-item-list/line-item-list';

@Component({
  selector: 'app-loan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, PageHeader, SectionCard, StatTile, LineItemList],
  templateUrl: './loan.html',
})
export class Loan {
  private readonly store = inject(FinanceStore);

  protected readonly emis = this.store.loanEmis;
  protected readonly derived = this.store.derived;
}
