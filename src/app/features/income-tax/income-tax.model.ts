export interface TaxSlab {
  minLimit: number;
  /** Upper bound of the slab; `-1` means "no upper bound". */
  maxLimit: number;
  percent: number;
}

/** Indian old-regime slabs (FY reference used by the original tool). */
export const OLD_REGIME_SLABS: readonly TaxSlab[] = [
  { minLimit: 0, maxLimit: 250_000, percent: 0 },
  { minLimit: 250_000, maxLimit: 500_000, percent: 5 },
  { minLimit: 500_000, maxLimit: 1_000_000, percent: 20 },
  { minLimit: 1_000_000, maxLimit: 1_500_000, percent: 30 },
  { minLimit: 1_500_000, maxLimit: -1, percent: 30 },
];

export const STANDARD_DEDUCTION = 50_000;
export const SECTION_80C_CAP = 150_000;
export const INSURANCE_CAP = 25_000;
export const CESS_RATE = 0.04;

export interface IncomeTaxInput {
  income: number;
  section80CInvestments: number;
  pfEmployerContribution: number;
  personalInsurance: number;
  parentInsurance: number;
}

export const DEFAULT_INCOME_TAX_INPUT: IncomeTaxInput = {
  income: 1_200_000,
  section80CInvestments: 0,
  pfEmployerContribution: 0,
  personalInsurance: 0,
  parentInsurance: 0,
};

export interface DeductionLine {
  label: string;
  amount: number;
}

export interface SlabBreakdown extends TaxSlab {
  taxableInSlab: number;
  tax: number;
}

export interface IncomeTaxResult {
  grossIncome: number;
  deductions: DeductionLine[];
  totalDeductions: number;
  netTaxableIncome: number;
  slabs: SlabBreakdown[];
  baseTax: number;
  cess: number;
  totalTax: number;
}

/**
 * Pure, side-effect-free old-regime income-tax calculation.
 *
 * The slab formula is clamped — `max(0, min(income, upper) - lower)` — which
 * fixes a latent bug in the original (slabs entirely above the taxable income
 * produced negative contributions) while yielding identical results for the
 * ranges the original handled correctly.
 */
export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  const deductions: DeductionLine[] = [
    { label: 'Standard Deduction', amount: STANDARD_DEDUCTION },
    { label: 'PF Employer Contribution', amount: nonNeg(input.pfEmployerContribution) },
    { label: '80C Investments', amount: cap(input.section80CInvestments, SECTION_80C_CAP) },
    { label: 'Personal Insurance (80D)', amount: cap(input.personalInsurance, INSURANCE_CAP) },
    { label: 'Parent Insurance (80D)', amount: cap(input.parentInsurance, INSURANCE_CAP) },
  ];

  const totalDeductions = deductions.reduce((sum, line) => sum + line.amount, 0);
  const netTaxableIncome = Math.max(0, nonNeg(input.income) - totalDeductions);

  const slabs: SlabBreakdown[] = OLD_REGIME_SLABS.map((slab) => {
    const upper = slab.maxLimit === -1 ? Number.POSITIVE_INFINITY : slab.maxLimit;
    const taxableInSlab = Math.max(0, Math.min(netTaxableIncome, upper) - slab.minLimit);
    return { ...slab, taxableInSlab, tax: (taxableInSlab * slab.percent) / 100 };
  });

  const baseTax = slabs.reduce((sum, slab) => sum + slab.tax, 0);
  const cess = baseTax * CESS_RATE;

  return {
    grossIncome: nonNeg(input.income),
    deductions,
    totalDeductions,
    netTaxableIncome,
    slabs,
    baseTax,
    cess,
    totalTax: baseTax + cess,
  };
}

function nonNeg(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function cap(value: number, max: number): number {
  return Math.min(nonNeg(value), max);
}
