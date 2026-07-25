import { inject, Injectable } from '@angular/core';
import { ComposedSheet, ExcelExportService } from './excel-export.service';
import { FinanceStore } from '../finance/finance-store';
import { TaxConfigStore } from '../finance/tax-config-store';
import { ProfileStore } from '../profile/profile-store';
import { icerScore } from '../finance/finance.model';

/**
 * Builds ONE workbook capturing the whole connected model across all pillars —
 * profile, income, spending, tax (with the active rulebook) — as plain computed
 * values (Pass 1). A later pass will emit live cross-sheet Excel formulas.
 *
 * Small tables are stacked to keep the workbook to two tabs (Overview, and
 * Income & Spending); we only split further if a section gets unwieldy.
 */
@Injectable({ providedIn: 'root' })
export class FinanceWorkbookService {
  private readonly excel = inject(ExcelExportService);
  private readonly finance = inject(FinanceStore);
  private readonly taxConfig = inject(TaxConfigStore);
  private readonly profile = inject(ProfileStore);

  /** Flush pending debounced writes, then build + download the workbook. */
  async export(fileName = 'personal-finance'): Promise<Blob> {
    await Promise.all([this.finance.flush(), this.taxConfig.flush()]);
    return this.excel.exportComposed(fileName, this.buildSheets());
  }

  buildSheets(): ComposedSheet[] {
    const d = this.finance.derived();
    const config = this.taxConfig.config();
    const p = this.profile.value();
    const tax = d.tax;
    const regimeLabel = tax.regime === 'new' ? 'New regime' : 'Old regime';

    const overview: ComposedSheet = {
      name: 'Overview',
      blocks: [
        {
          title: 'Profile',
          headers: ['Field', 'Value'],
          rows: [
            ['Name', p.name],
            ['Email', p.email],
            ['Phone', p.phone],
            [
              'Address',
              [p.addressLine1, p.addressLine2, p.city, p.state, p.postalCode, p.country]
                .filter(Boolean)
                .join(', '),
            ],
            ['Notes', p.notes],
          ],
        },
        {
          title: 'Summary (monthly unless noted)',
          headers: ['Metric', 'Value (₹)'],
          rows: [
            ['Financial year', config.fyLabel],
            ['Tax regime', regimeLabel],
            ['Gross income / month', d.gross],
            ['Gross income / year', d.annualGross],
            ['Tax payable / year', round(d.taxAnnual)],
            ['Tax payable / month', round(d.taxPayable)],
            ['Net income / month', round(d.netIncome)],
            ['Total needs / month (incl. loan EMIs)', d.totalNeeds],
            ['Total wants / month', d.totalWants],
            ['Short-term savings / month', d.shortTermSavings],
            ['Insurance premiums / month', d.totalInsurance],
            ['Long-term investments / month', d.totalInvestments],
            ['Minimum income / month', round(d.minimumIncome)],
            [d.surplus >= 0 ? 'Surplus / month' : 'Deficit / month', round(d.surplus)],
          ],
        },
        {
          title: `Tax — ${regimeLabel}`,
          headers: ['Field', 'Value (₹)'],
          rows: [
            ['Gross income', tax.grossIncome],
            ...tax.deductions.map((line): [string, number] => [line.label, round(line.amount)]),
            ['Total deductions', round(tax.totalDeductions)],
            ['Net taxable income', round(tax.netTaxableIncome)],
            ['Base tax', round(tax.baseTax)],
            ['87A rebate', round(tax.rebate)],
            [`Cess (${round2(config.cessRate * 100)}%)`, round(tax.cess)],
            ['Total tax', round(tax.totalTax)],
          ],
        },
        {
          title: 'Tax slabs (active regime)',
          headers: ['From (₹)', 'Up to (₹)', 'Rate (%)', 'Taxable in slab (₹)', 'Tax (₹)'],
          rows: tax.slabs.map((s): [number, string | number, number, number, number] => [
            s.minLimit,
            s.maxLimit === -1 ? 'and above' : s.maxLimit,
            s.percent,
            round(s.taxableInSlab),
            round(s.tax),
          ]),
        },
      ],
    };

    const detail: ComposedSheet = {
      name: 'Income & Spending',
      blocks: [
        {
          title: 'Goals',
          headers: ['Category', 'Goal'],
          rows: [
            ...this.finance.mustHaveGoals.items().map((g): [string, string] => ['Must have', g.text]),
            ...this.finance.goodToHaveGoals
              .items()
              .map((g): [string, string] => ['Good to have', g.text]),
          ],
        },
        {
          title: 'Income ideas (ICER)',
          headers: ['Idea', 'Interest', 'Capability', 'Effortlessness', 'Return', 'Score'],
          rows: this.finance.ideas
            .items()
            .map((i): [string, number, number, number, number, number] => [
              i.name,
              i.interest,
              i.capability,
              i.effortlessness,
              i.return,
              round2(icerScore(i)),
            ]),
        },
        {
          title: 'Spending',
          headers: ['Category', 'Item', 'Amount / month (₹)'],
          rows: [
            ...this.finance.needs.items().map((n): [string, string, number] => ['Need', n.type, n.value]),
            ...this.finance.wants.items().map((w): [string, string, number] => ['Want', w.type, w.value]),
          ],
        },
        {
          title: 'Insurance premiums',
          headers: ['Policy', 'Frequency', 'Premium (₹)'],
          rows: this.finance.insurancePremiums
            .items()
            .map((p): [string, string, number] => [p.type, p.period ?? 'monthly', p.value]),
        },
        {
          title: 'Investing contributions',
          headers: ['Instrument', 'Type', 'Amount / month (₹)'],
          rows: [
            ...this.finance.investingMandatory
              .items()
              .map((c): [string, string, number] => [c.type, 'Mandatory', c.value]),
            ...this.finance.investingVoluntary
              .items()
              .map((c): [string, string, number] => [c.type, 'Voluntary', c.value]),
          ],
        },
      ],
    };

    return [overview, detail];
  }
}

function round(value: number): number {
  return Math.round(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
