import {
  calculateTax,
  DEFAULT_OLD_REGIME_DEDUCTIONS,
  OldRegimeDeductions,
  TaxRegime,
  TaxResult,
} from './tax.model';

export interface LineItem {
  id: string;
  type: string;
  value: number;
}

export interface Goal {
  id: string;
  text: string;
}

/** An income idea rated on the ICER axes (each 1–5). */
export interface IdeaRow {
  id: string;
  name: string;
  interest: number;
  capability: number;
  effortlessness: number;
  return: number;
}

export interface FinanceInputs {
  income: {
    gross: number;
    shortTermSavings: number;
  };
  goals: {
    mustHave: Goal[];
    goodToHave: Goal[];
  };
  ideas: IdeaRow[];
  spending: {
    needs: LineItem[];
    wants: LineItem[];
  };
  // Owned by the Coming-soon pillars — modelled now, contribute 0 until built.
  loan: { emis: LineItem[] };
  insurance: { premiums: LineItem[] };
  investing: { contributions: LineItem[] };
  tax: {
    regime: TaxRegime;
    deductions: OldRegimeDeductions;
  };
}

export interface DerivedFinance {
  gross: number;
  totalNeeds: number;
  totalWants: number;
  totalLoanEmis: number;
  totalInsurance: number;
  totalInvestments: number;
  shortTermSavings: number;
  tax: TaxResult;
  taxPayable: number;
  netIncome: number;
  minimumIncome: number;
  surplus: number;
}

let idCounter = 0;

/** Stable-ish unique id for list rows (crypto in the browser, counter fallback). */
export function makeId(prefix = 'id'): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return uuid;
  }
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function makeLineItem(type = '', value = 0): LineItem {
  return { id: makeId('li'), type, value };
}

export function makeGoal(text = ''): Goal {
  return { id: makeId('goal'), text };
}

export function makeIdea(name = ''): IdeaRow {
  return { id: makeId('idea'), name, interest: 3, capability: 3, effortlessness: 3, return: 3 };
}

export function sumLineItems(items: readonly LineItem[]): number {
  return items.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0), 0);
}

/** Average of the four 1–5 ICER axes. */
export function icerScore(row: IdeaRow): number {
  return (row.interest + row.capability + row.effortlessness + row.return) / 4;
}

export const DEFAULT_FINANCE_INPUTS: FinanceInputs = {
  income: { gross: 1_200_000, shortTermSavings: 0 },
  goals: {
    mustHave: [
      makeGoal('Never face a financial crisis'),
      makeGoal('Reach upper-middle class in 5 years'),
      makeGoal('Retire peacefully'),
    ],
    goodToHave: [makeGoal('Take a trip')],
  },
  ideas: [],
  spending: { needs: [], wants: [] },
  loan: { emis: [] },
  insurance: { premiums: [] },
  investing: { contributions: [] },
  tax: { regime: 'old', deductions: { ...DEFAULT_OLD_REGIME_DEDUCTIONS } },
};

/**
 * The single source of every derived number. Gross Income is the one entered
 * value that drives tax; Minimum Income is derived (never re-typed). This breaks
 * the Gross ↔ Tax ↔ Minimum cycle: Gross is input, Minimum is a comparison target.
 */
export function deriveFinance(inputs: FinanceInputs): DerivedFinance {
  const gross = Math.max(0, inputs.income.gross || 0);
  const shortTermSavings = Math.max(0, inputs.income.shortTermSavings || 0);

  const totalLoanEmis = sumLineItems(inputs.loan.emis);
  const totalNeeds = sumLineItems(inputs.spending.needs) + totalLoanEmis; // EMIs roll into Needs
  const totalWants = sumLineItems(inputs.spending.wants);
  const totalInsurance = sumLineItems(inputs.insurance.premiums);
  const totalInvestments = sumLineItems(inputs.investing.contributions);

  const tax = calculateTax(inputs.tax.regime, gross, inputs.tax.deductions);
  const taxPayable = tax.totalTax;
  const netIncome = gross - taxPayable;

  // Literal spec formula (subtracts tax); centralised here for easy adjustment.
  const minimumIncome =
    totalNeeds + totalWants + shortTermSavings + totalInsurance + totalInvestments - taxPayable;

  return {
    gross,
    totalNeeds,
    totalWants,
    totalLoanEmis,
    totalInsurance,
    totalInvestments,
    shortTermSavings,
    tax,
    taxPayable,
    netIncome,
    minimumIncome,
    surplus: netIncome - minimumIncome,
  };
}
