import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InrPipe } from '../../shared/inr-pipe';
import { FinanceStore } from '../../core/finance/finance-store';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { LineItemList } from '../../shared/ui/line-item-list/line-item-list';

@Component({
  selector: 'app-investing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InrPipe, PageHeader, SectionCard, StatTile, LineItemList],
  templateUrl: './investing.html',
})
export class Investing {
  private readonly store = inject(FinanceStore);

  protected readonly mandatory = this.store.investingMandatory;
  protected readonly voluntary = this.store.investingVoluntary;
  protected readonly derived = this.store.derived;
}
