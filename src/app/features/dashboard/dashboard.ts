import { ChangeDetectionStrategy, Component, computed, HostListener, inject } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FinanceStore } from '../../core/finance/finance-store';
import { PILLARS } from '../../app.routes';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { PillarCard } from '../../shared/ui/pillar-card/pillar-card';
import { SectionCard } from '../../shared/ui/section-card/section-card';

type AllocKey = 'living' | 'safety' | 'growth';

interface AllocSeg {
  label: string;
  amount: number;
  color: string;
  pct: number; // width as % of the whole allocation
}

interface AllocView {
  key: AllocKey;
  label: string;
  color: string;
  amount: number;
  actual: number; // % of the three buckets
  target: number; // % target
  segments: AllocSeg[]; // coloured sub-components (Needs/Wants/EPF, …)
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    MatIconModule,
    PageHeader,
    StatTile,
    PillarCard,
    SectionCard,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly store = inject(FinanceStore);

  protected readonly derived = this.store.derived;
  protected readonly pillars = PILLARS.filter((p) => p.path !== 'dashboard');

  // ---- Monthly spend allocation (Living : Safety : Growth & Freedom) ----
  // The two boundary handles keep the split at 100% by construction, so there's
  // no separate "must total 100" validation to worry about.
  protected readonly allocationTarget = this.store.allocationTarget;
  protected readonly boundary1 = computed(() => this.allocationTarget().living);
  protected readonly boundary2 = computed(
    () => this.allocationTarget().living + this.allocationTarget().safety,
  );
  protected readonly allocationView = computed<AllocView[]>(() => {
    const d = this.derived();
    const a = d.allocation;
    const t = this.allocationTarget();
    const total = a.total || 1;
    const seg = (label: string, amount: number, color: string): AllocSeg => ({
      label,
      amount,
      color,
      pct: (amount / total) * 100,
    });
    return [
      {
        key: 'living',
        label: 'Living',
        color: '#6366f1',
        amount: a.living,
        actual: (a.living / total) * 100,
        target: t.living,
        segments: [
          seg('Needs', d.totalNeeds, '#6366f1'),
          seg('Wants', d.totalWants, '#8b7cff'),
          seg('EPF/NPS', d.mandatoryInvestments, '#3b82f6'),
        ].filter((s) => s.amount > 0),
      },
      {
        key: 'safety',
        label: 'Safety',
        color: '#22d3ee',
        amount: a.safety,
        actual: (a.safety / total) * 100,
        target: t.safety,
        segments: [
          seg('Insurance', d.totalInsurance, '#22d3ee'),
          seg('Savings', d.shortTermSavings, '#2dd4bf'),
        ].filter((s) => s.amount > 0),
      },
      {
        key: 'growth',
        label: 'Growth & Freedom',
        color: '#f5b544',
        amount: a.growthFreedom,
        actual: (a.growthFreedom / total) * 100,
        target: t.growth,
        segments: [seg('Investments', d.discretionaryInvestments, '#f5b544')].filter(
          (s) => s.amount > 0,
        ),
      },
    ];
  });

  private dragging: 'h1' | 'h2' | null = null;
  private barEl: HTMLElement | null = null;

  protected onHandleDown(which: 'h1' | 'h2', event: PointerEvent): void {
    event.preventDefault();
    this.dragging = which;
    this.barEl = (event.currentTarget as HTMLElement).parentElement;
  }

  @HostListener('document:pointermove', ['$event'])
  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging || !this.barEl) return;
    const rect = this.barEl.getBoundingClientRect();
    const pct = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    this.moveBoundary(this.dragging, pct);
  }

  @HostListener('document:pointerup')
  protected onPointerUp(): void {
    this.dragging = null;
    this.barEl = null;
  }

  /** Keyboard nudge for accessibility (arrow keys move a handle by 1%). */
  protected onHandleKey(which: 'h1' | 'h2', event: KeyboardEvent): void {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const current = which === 'h1' ? this.boundary1() : this.boundary2();
    this.moveBoundary(which, current + delta);
  }

  private moveBoundary(which: 'h1' | 'h2', pct: number): void {
    const t = this.allocationTarget();
    const h1 = t.living;
    const h2 = t.living + t.safety;
    if (which === 'h1') {
      const living = Math.min(Math.max(pct, 0), h2);
      this.store.setAllocationTarget({ living, safety: h2 - living });
    } else {
      const nh2 = Math.min(Math.max(pct, h1), 100);
      this.store.setAllocationTarget({ safety: nh2 - h1, growth: 100 - nh2 });
    }
  }

  protected pillarValue(path: string): string {
    const d = this.derived();
    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    switch (path) {
      case 'income':
        return fmt(d.netIncome);
      case 'spending':
        return fmt(d.totalNeeds + d.totalWants);
      case 'insurance':
        return fmt(d.totalInsurance);
      case 'investing':
        return fmt(d.totalInvestments);
      case 'tax':
        return fmt(d.taxPayable);
      default:
        return '';
    }
  }
}
