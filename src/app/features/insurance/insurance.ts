import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InrPipe } from '../../shared/inr-pipe';
import { FinanceStore } from '../../core/finance/finance-store';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { LineItemList } from '../../shared/ui/line-item-list/line-item-list';

@Component({
  selector: 'app-insurance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InrPipe, PageHeader, SectionCard, StatTile, LineItemList],
  templateUrl: './insurance.html',
})
export class Insurance {
  private readonly store = inject(FinanceStore);

  protected readonly premiums = this.store.insurancePremiums;
  protected readonly derived = this.store.derived;
}
