import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { InrPipe } from '../../shared/inr-pipe';
import { FinanceStore } from '../../core/finance/finance-store';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { LineItemList } from '../../shared/ui/line-item-list/line-item-list';
import { InflationAdjuster } from './inflation-adjuster';
import { NpsCalculator } from './nps-calculator';

@Component({
  selector: 'app-investing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    InrPipe,
    MatTabsModule,
    PageHeader,
    SectionCard,
    StatTile,
    LineItemList,
    InflationAdjuster,
    NpsCalculator,
  ],
  templateUrl: './investing.html',
})
export class Investing {
  private readonly store = inject(FinanceStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly mandatory = this.store.investingMandatory;
  protected readonly voluntary = this.store.investingVoluntary;
  protected readonly derived = this.store.derived;

  // ---- Deep-linkable tabs (?tab=contributions|inflation|nps) ----
  private readonly tabSlugs = ['contributions', 'inflation', 'nps'];
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly selectedTab = computed(() => {
    const idx = this.tabSlugs.indexOf(this.queryParams().get('tab') ?? '');
    return idx >= 0 ? idx : 0;
  });
  protected onTabChange(index: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: this.tabSlugs[index] },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
