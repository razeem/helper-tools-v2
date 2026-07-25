import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { FinanceStore } from '../../core/finance/finance-store';
import { FY_MONTHS, icerScore, IdeaRow, makeGoal, makeIdea } from '../../core/finance/finance.model';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { InlinePrompt } from '../../shared/ui/inline-prompt/inline-prompt';
import { RatingInput } from '../../shared/ui/rating-input/rating-input';

type IcerAxis = 'interest' | 'capability' | 'effortlessness' | 'return';
type SortKey = 'name' | IcerAxis | 'score';

@Component({
  selector: 'app-income',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    RouterLink,
    FormsModule,
    DragDropModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    PageHeader,
    SectionCard,
    StatTile,
    InlinePrompt,
    RatingInput,
  ],
  templateUrl: './income.html',
  styleUrl: './income.scss',
})
export class Income {
  private readonly store = inject(FinanceStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ---- Deep-linkable tabs (?tab=minimum|goals|ideas) ----
  // A query param (not a fragment) so the router owns it, it survives reload,
  // and the tab components stay mounted (local state like sort order is kept).
  private readonly tabSlugs = ['minimum', 'goals', 'ideas'];
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

  protected readonly inputs = this.store.inputs;
  protected readonly derived = this.store.derived;
  protected readonly mustHave = this.store.mustHaveGoals;
  protected readonly goodToHave = this.store.goodToHaveGoals;
  protected readonly ideas = this.store.ideas;

  // ---- Monthly salary breakdown (Apr → Mar) ----
  protected readonly months = this.store.months;
  protected readonly fyMonths = FY_MONTHS;
  protected readonly fyLabel = this.store.fyLabel;
  protected setMonthBase(index: number, value: string | number): void {
    this.store.setMonthBase(index, typeof value === 'number' ? value : Number(value));
  }
  protected setMonthBonus(index: number, value: string | number): void {
    this.store.setMonthBonus(index, typeof value === 'number' ? value : Number(value));
  }

  protected readonly score = icerScore;
  protected readonly icerAxes: { key: IcerAxis; label: string; help: string }[] = [
    { key: 'interest', label: 'Interest', help: 'Do you care about it?' },
    { key: 'capability', label: 'Capability', help: 'Can you do it well?' },
    { key: 'effortlessness', label: 'Effortlessness', help: 'Feels easy vs alternatives?' },
    { key: 'return', label: 'Return', help: 'Will it pay off?' },
  ];

  // ---- Minimum Income (owns gross + short-term savings) ----
  protected setGross(value: string | number): void {
    this.store.setGross(typeof value === 'number' ? value : Number(value));
  }
  protected setShortTermSavings(value: string | number): void {
    this.store.setShortTermSavings(typeof value === 'number' ? value : Number(value));
  }

  protected readonly minIncomeRows = computed(() => {
    const d = this.derived();
    return [
      { label: 'Needs', amount: d.totalNeeds, link: '/spending' },
      { label: 'Wants', amount: d.totalWants, link: '/spending' },
      { label: 'Short-term savings', amount: d.shortTermSavings, link: null },
      { label: 'Insurance premiums', amount: d.totalInsurance, link: null },
      { label: 'Long-term investments', amount: d.totalInvestments, link: null },
      { label: 'Less: taxes', amount: -d.taxPayable, link: null },
    ];
  });

  // ---- Goals ----
  protected addMustHave(): void {
    this.mustHave.add(makeGoal());
  }
  protected addGoodToHave(): void {
    this.goodToHave.add(makeGoal());
  }
  protected dropMustHave(event: CdkDragDrop<unknown>): void {
    this.mustHave.reorder(event.previousIndex, event.currentIndex);
  }
  protected dropGoodToHave(event: CdkDragDrop<unknown>): void {
    this.goodToHave.reorder(event.previousIndex, event.currentIndex);
  }

  // ---- Ideas (ICER) ----
  // Sorting is a one-shot *snapshot*, not a live computed: clicking a header
  // reorders the rows once, but editing a rating afterwards must NOT make its
  // row jump to a new position (that reads as "my change hit another row").
  // `order` holds the id sequence captured at the last sort; null = insertion order.
  // `sortKey` is null until the user clicks a header, so no column shows a stale
  // sort arrow while the rows are still in insertion order.
  protected readonly sortKey = signal<SortKey | null>(null);
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');
  private readonly order = signal<readonly string[] | null>(null);

  protected readonly sortedIdeas = computed(() => {
    const rows = this.ideas.items();
    const snapshot = this.order();
    if (!snapshot) {
      return rows; // insertion order until the user explicitly sorts
    }
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered: IdeaRow[] = [];
    for (const id of snapshot) {
      const row = byId.get(id);
      if (row) {
        ordered.push(row);
        byId.delete(id);
      }
    }
    // Any rows added since the snapshot (not in `order`) trail in insertion order.
    for (const row of rows) {
      if (byId.has(row.id)) {
        ordered.push(row);
      }
    }
    return ordered;
  });

  protected toggleSort(key: SortKey): void {
    const dir: 'asc' | 'desc' =
      this.sortKey() === key
        ? this.sortDir() === 'asc'
          ? 'desc'
          : 'asc'
        : key === 'name'
          ? 'asc'
          : 'desc';
    this.sortKey.set(key);
    this.sortDir.set(dir);

    const factor = dir === 'asc' ? 1 : -1;
    const sorted = [...this.ideas.items()].sort((a, b) => {
      const av = key === 'score' ? icerScore(a) : key === 'name' ? a.name.toLowerCase() : a[key];
      const bv = key === 'score' ? icerScore(b) : key === 'name' ? b.name.toLowerCase() : b[key];
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
    this.order.set(sorted.map((r) => r.id));
  }

  protected addIdea(): void {
    this.ideas.add(makeIdea());
  }
  protected setIdeaName(id: string, name: string): void {
    this.ideas.update(id, { name });
  }
  protected setIdeaAxis(id: string, axis: IcerAxis, value: number): void {
    this.ideas.update(id, { [axis]: value } as Partial<IdeaRow>);
  }
}
