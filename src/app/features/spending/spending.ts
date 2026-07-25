import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FinanceStore } from '../../core/finance/finance-store';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { LineItemList } from '../../shared/ui/line-item-list/line-item-list';

@Component({
  selector: 'app-spending',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, PageHeader, SectionCard, StatTile, LineItemList],
  templateUrl: './spending.html',
})
export class Spending {
  private readonly store = inject(FinanceStore);

  protected readonly needs = this.store.needs;
  protected readonly wants = this.store.wants;
  protected readonly derived = this.store.derived;
}
