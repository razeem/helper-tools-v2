import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FinanceStore } from '../../core/finance/finance-store';
import { TaxConfigStore } from '../../core/finance/tax-config-store';
import {
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  OldRegimeDeductions,
  TaxRegime,
} from '../../core/finance/tax.model';
import { ExcelExportService } from '../../core/export/excel-export.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SectionCard } from '../../shared/ui/section-card/section-card';
import { StatTile } from '../../shared/ui/stat-tile/stat-tile';
import { InlinePrompt } from '../../shared/ui/inline-prompt/inline-prompt';

interface DeductionField {
  key: keyof OldRegimeDeductions;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-tax',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    PercentPipe,
    FormsModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    PageHeader,
    SectionCard,
    StatTile,
    InlinePrompt,
  ],
  templateUrl: './tax.html',
  styleUrl: './tax.scss',
})
export class Tax {
  private readonly store = inject(FinanceStore);
  private readonly taxConfig = inject(TaxConfigStore);
  private readonly excel = inject(ExcelExportService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ---- Deep-linkable tabs (?tab=calculator|comparer) ----
  private readonly tabSlugs = ['calculator', 'comparer'];
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
  protected readonly result = computed(() => this.derived().tax);
  // Tax is assessed on the ANNUAL gross (monthly income × 12).
  protected readonly gross = computed(() => this.derived().annualGross);
  protected readonly monthlyGross = computed(() => this.derived().gross);
  protected readonly exporting = signal(false);

  protected readonly comparison = computed(() => {
    const gross = this.gross();
    const config = this.taxConfig.config();
    const old = calculateOldRegimeTax(gross, this.inputs().tax.deductions, config);
    const neu = calculateNewRegimeTax(gross, config);
    const better: TaxRegime = neu.totalTax <= old.totalTax ? 'new' : 'old';
    return { old, new: neu, better, saving: Math.abs(old.totalTax - neu.totalTax) };
  });

  protected readonly deductionFields: DeductionField[] = [
    { key: 'pfEmployerContribution', label: 'PF employer contribution', hint: 'Deducted in full' },
    { key: 'section80CInvestments', label: '80C investments', hint: 'Capped at ₹1,50,000' },
    { key: 'personalInsurance', label: 'Personal insurance (80D)', hint: 'Capped at ₹25,000' },
    { key: 'parentInsurance', label: 'Parent insurance (80D)', hint: 'Capped at ₹25,000' },
  ];

  protected readonly deductionColumns = ['label', 'amount'] as const;
  protected readonly slabColumns = ['range', 'percent', 'taxable', 'tax'] as const;

  protected setRegime(regime: TaxRegime): void {
    this.store.setRegime(regime);
  }

  protected setDeduction(key: keyof OldRegimeDeductions, value: string | number): void {
    this.store.setDeduction(key, typeof value === 'number' ? value : Number(value));
  }

  protected async exportXlsx(): Promise<void> {
    this.exporting.set(true);
    try {
      await this.store.flush();
      const r = this.result();
      const c = this.comparison();
      await this.excel.export('tax-breakdown', [
        {
          name: 'Summary',
          columns: [
            { header: 'Item', key: 'item', width: 34 },
            { header: 'Amount (INR)', key: 'amount', width: 20 },
          ],
          rows: [
            { item: `Regime`, amount: r.regime === 'new' ? 'New' : 'Old' },
            { item: 'Gross income', amount: r.grossIncome },
            { item: 'Total deductions', amount: r.totalDeductions },
            { item: 'Net taxable income', amount: r.netTaxableIncome },
            { item: 'Base tax', amount: r.baseTax },
            { item: '87A rebate', amount: r.rebate },
            { item: 'Health & education cess (4%)', amount: r.cess },
            { item: 'Total tax payable', amount: r.totalTax },
          ],
        },
        {
          name: 'Regime comparison',
          columns: [
            { header: 'Regime', key: 'regime', width: 16 },
            { header: 'Net taxable (INR)', key: 'net', width: 20 },
            { header: 'Total tax (INR)', key: 'tax', width: 20 },
          ],
          rows: [
            { regime: 'Old', net: c.old.netTaxableIncome, tax: c.old.totalTax },
            { regime: 'New', net: c.new.netTaxableIncome, tax: c.new.totalTax },
          ],
        },
      ]);
      this.snackBar.open('Exported tax-breakdown.xlsx', 'Dismiss', { duration: 3000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Export failed — see console', 'Dismiss', { duration: 4000 });
    } finally {
      this.exporting.set(false);
    }
  }
}
