import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StorageService } from '../../core/storage/storage.service';
import { ExcelExportService } from '../../core/export/excel-export.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { calculateIncomeTax, DEFAULT_INCOME_TAX_INPUT, IncomeTaxInput } from './income-tax.model';

interface Field {
  key: keyof IncomeTaxInput;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-income-tax',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    PageHeader,
  ],
  templateUrl: './income-tax.html',
  styleUrl: './income-tax.scss',
})
export class IncomeTax {
  private readonly storage = inject(StorageService);
  private readonly excel = inject(ExcelExportService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly store = this.storage.bind<IncomeTaxInput>({
    key: 'income-tax',
    version: 1,
    defaults: DEFAULT_INCOME_TAX_INPUT,
  });

  protected readonly ready = this.store.ready;
  protected readonly input = this.store.value;
  protected readonly result = computed(() => calculateIncomeTax(this.input()));
  protected readonly exporting = signal(false);

  protected readonly fields: Field[] = [
    { key: 'income', label: 'Gross annual income', hint: 'Total salary before deductions' },
    { key: 'pfEmployerContribution', label: 'PF employer contribution', hint: 'Deducted in full' },
    { key: 'section80CInvestments', label: '80C investments', hint: 'Capped at ₹1,50,000' },
    { key: 'personalInsurance', label: 'Personal insurance (80D)', hint: 'Capped at ₹25,000' },
    { key: 'parentInsurance', label: 'Parent insurance (80D)', hint: 'Capped at ₹25,000' },
  ];

  protected readonly deductionColumns = ['label', 'amount'] as const;
  protected readonly slabColumns = ['range', 'percent', 'taxable', 'tax'] as const;

  protected setField(key: keyof IncomeTaxInput, value: string | number): void {
    const numeric = typeof value === 'number' ? value : Number(value);
    this.store.patch({ [key]: Number.isFinite(numeric) ? numeric : 0 } as Partial<IncomeTaxInput>);
  }

  protected reset(): void {
    void this.store.reset();
  }

  protected async exportXlsx(): Promise<void> {
    this.exporting.set(true);
    try {
      await this.store.flush();
      const result = this.result();
      await this.excel.export('income-tax-breakdown', [
        {
          name: 'Summary',
          columns: [
            { header: 'Item', key: 'item', width: 32 },
            { header: 'Amount (INR)', key: 'amount', width: 20 },
          ],
          rows: [
            { item: 'Gross income', amount: result.grossIncome },
            { item: 'Total deductions', amount: result.totalDeductions },
            { item: 'Net taxable income', amount: result.netTaxableIncome },
            { item: 'Base tax', amount: result.baseTax },
            { item: 'Health & education cess (4%)', amount: result.cess },
            { item: 'Total tax payable', amount: result.totalTax },
          ],
        },
        {
          name: 'Deductions',
          columns: [
            { header: 'Deduction', key: 'label', width: 32 },
            { header: 'Amount (INR)', key: 'amount', width: 20 },
          ],
          rows: result.deductions.map((d) => ({ label: d.label, amount: d.amount })),
        },
        {
          name: 'Slabs',
          columns: [
            { header: 'From (INR)', key: 'from', width: 16 },
            { header: 'To (INR)', key: 'to', width: 16 },
            { header: 'Rate (%)', key: 'percent', width: 12 },
            { header: 'Taxable in slab (INR)', key: 'taxable', width: 22 },
            { header: 'Tax (INR)', key: 'tax', width: 16 },
          ],
          rows: result.slabs.map((s) => ({
            from: s.minLimit,
            to: s.maxLimit === -1 ? 'and above' : s.maxLimit,
            percent: s.percent,
            taxable: s.taxableInSlab,
            tax: s.tax,
          })),
        },
      ]);
      this.snackBar.open('Exported income-tax-breakdown.xlsx', 'Dismiss', { duration: 3000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Export failed — see console', 'Dismiss', { duration: 4000 });
    } finally {
      this.exporting.set(false);
    }
  }
}
