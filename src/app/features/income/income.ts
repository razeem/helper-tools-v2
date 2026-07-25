import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FinanceStore } from '../../core/finance/finance-store';
import { icerScore, IdeaRow, makeGoal, makeIdea } from '../../core/finance/finance.model';
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
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
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

  protected readonly inputs = this.store.inputs;
  protected readonly derived = this.store.derived;
  protected readonly mustHave = this.store.mustHaveGoals;
  protected readonly goodToHave = this.store.goodToHaveGoals;
  protected readonly ideas = this.store.ideas;

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

  // ---- Ideas (ICER) ----
  protected readonly sortKey = signal<SortKey>('score');
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');

  protected readonly sortedIdeas = computed(() => {
    const rows = [...this.ideas.items()];
    const key = this.sortKey();
    const dir = this.sortDir();
    const factor = dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      const av = key === 'score' ? icerScore(a) : key === 'name' ? a.name.toLowerCase() : a[key];
      const bv = key === 'score' ? icerScore(b) : key === 'name' ? b.name.toLowerCase() : b[key];
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
  });

  protected toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'name' ? 'asc' : 'desc');
    }
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
