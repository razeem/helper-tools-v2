export type TaxRegime = 'old' | 'new';

export interface TaxSlab {
  minLimit: number;
  /** Upper bound of the slab; `-1` means "no upper bound". */
  maxLimit: number;
  percent: number;
}

export interface SlabBreakdown extends TaxSlab {
  taxableInSlab: number;
  tax: number;
}

export interface DeductionLine {
  label: string;
  amount: number;
}

export interface TaxResult {
  regime: TaxRegime;
  grossIncome: number;
  deductions: DeductionLine[];
  totalDeductions: number;
  netTaxableIncome: number;
  slabs: SlabBreakdown[];
  baseTax: number;
  rebate: number;
  cess: number;
  totalTax: number;
}

export const CESS_RATE = 0.04;

// ---- Old regime (progressive slabs + 80C/80D/PF deductions) ----
export const OLD_REGIME_SLABS: readonly TaxSlab[] = [
  { minLimit: 0, maxLimit: 250_000, percent: 0 },
  { minLimit: 250_000, maxLimit: 500_000, percent: 5 },
  { minLimit: 500_000, maxLimit: 1_000_000, percent: 20 },
  { minLimit: 1_000_000, maxLimit: 1_500_000, percent: 30 },
  { minLimit: 1_500_000, maxLimit: -1, percent: 30 },
];

export const OLD_STANDARD_DEDUCTION = 50_000;
export const SECTION_80C_CAP = 150_000;
export const INSURANCE_CAP = 25_000;

// ---- New regime (concessional slabs, standard deduction only, 87A rebate) ----
export const NEW_REGIME_SLABS: readonly TaxSlab[] = [
  { minLimit: 0, maxLimit: 300_000, percent: 0 },
  { minLimit: 300_000, maxLimit: 700_000, percent: 5 },
  { minLimit: 700_000, maxLimit: 1_000_000, percent: 10 },
  { minLimit: 1_000_000, maxLimit: 1_200_000, percent: 15 },
  { minLimit: 1_200_000, maxLimit: 1_500_000, percent: 20 },
  { minLimit: 1_500_000, maxLimit: -1, percent: 30 },
];

export const NEW_STANDARD_DEDUCTION = 75_000;
/** New-regime 87A rebate: net taxable income at or below this pays no base tax. */
export const NEW_REGIME_REBATE_LIMIT = 700_000;

export interface OldRegimeDeductions {
  section80CInvestments: number;
  pfEmployerContribution: number;
  personalInsurance: number;
  parentInsurance: number;
}

export const DEFAULT_OLD_REGIME_DEDUCTIONS: OldRegimeDeductions = {
  section80CInvestments: 0,
  pfEmployerContribution: 0,
  personalInsurance: 0,
  parentInsurance: 0,
};

function nonNeg(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function cap(value: number, max: number): number {
  return Math.min(nonNeg(value), max);
}

/** Clamped progressive slab tax: `max(0, min(income, upper) - lower) * rate`. */
function applySlabs(netTaxable: number, slabs: readonly TaxSlab[]): SlabBreakdown[] {
  return slabs.map((slab) => {
    const upper = slab.maxLimit === -1 ? Number.POSITIVE_INFINITY : slab.maxLimit;
    const taxableInSlab = Math.max(0, Math.min(netTaxable, upper) - slab.minLimit);
    return { ...slab, taxableInSlab, tax: (taxableInSlab * slab.percent) / 100 };
  });
}

export function calculateOldRegimeTax(gross: number, d: OldRegimeDeductions): TaxResult {
  const deductions: DeductionLine[] = [
    { label: 'Standard Deduction', amount: OLD_STANDARD_DEDUCTION },
    { label: 'PF Employer Contribution', amount: nonNeg(d.pfEmployerContribution) },
    { label: '80C Investments', amount: cap(d.section80CInvestments, SECTION_80C_CAP) },
    { label: 'Personal Insurance (80D)', amount: cap(d.personalInsurance, INSURANCE_CAP) },
    { label: 'Parent Insurance (80D)', amount: cap(d.parentInsurance, INSURANCE_CAP) },
  ];
  const totalDeductions = deductions.reduce((sum, line) => sum + line.amount, 0);
  const netTaxableIncome = Math.max(0, nonNeg(gross) - totalDeductions);
  const slabs = applySlabs(netTaxableIncome, OLD_REGIME_SLABS);
  const baseTax = slabs.reduce((sum, slab) => sum + slab.tax, 0);
  const cess = baseTax * CESS_RATE;

  return {
    regime: 'old',
    grossIncome: nonNeg(gross),
    deductions,
    totalDeductions,
    netTaxableIncome,
    slabs,
    baseTax,
    rebate: 0,
    cess,
    totalTax: baseTax + cess,
  };
}

export function calculateNewRegimeTax(gross: number): TaxResult {
  const deductions: DeductionLine[] = [
    { label: 'Standard Deduction', amount: NEW_STANDARD_DEDUCTION },
  ];
  const totalDeductions = NEW_STANDARD_DEDUCTION;
  const netTaxableIncome = Math.max(0, nonNeg(gross) - totalDeductions);
  const slabs = applySlabs(netTaxableIncome, NEW_REGIME_SLABS);
  const rawTax = slabs.reduce((sum, slab) => sum + slab.tax, 0);
  // Section 87A rebate: full base tax rebated at or below the limit.
  const rebate = netTaxableIncome <= NEW_REGIME_REBATE_LIMIT ? rawTax : 0;
  const baseTax = rawTax - rebate;
  const cess = baseTax * CESS_RATE;

  return {
    regime: 'new',
    grossIncome: nonNeg(gross),
    deductions,
    totalDeductions,
    netTaxableIncome,
    slabs,
    baseTax,
    rebate,
    cess,
    totalTax: baseTax + cess,
  };
}

export function calculateTax(
  regime: TaxRegime,
  gross: number,
  deductions: OldRegimeDeductions,
): TaxResult {
  return regime === 'new' ? calculateNewRegimeTax(gross) : calculateOldRegimeTax(gross, deductions);
}
