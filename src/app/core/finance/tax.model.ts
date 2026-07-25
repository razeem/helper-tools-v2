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

/**
 * Per-regime rules. Everything here is data — it ships with current-year defaults
 * but is user-overridable (see `TaxConfigStore` / the Settings "Tax rules" tab).
 */
export interface RegimeRules {
  slabs: TaxSlab[];
  standardDeduction: number;
  /** Net taxable income at or below this gets the 87A rebate (0 disables it). */
  rebateLimit: number;
  /** Cap on the 87A rebate amount. */
  rebateMaxAmount: number;
}

/** The complete, editable tax rulebook for one financial year. */
export interface TaxConfig {
  fyLabel: string;
  cessRate: number;
  caps: {
    section80C: number;
    insurance: number;
  };
  old: RegimeRules;
  new: RegimeRules;
}

/**
 * Standard baseline shipped for everyone: India FY 2025-26 (AY 2026-27).
 * New regime reflects Budget 2025 — seven slabs and an 87A rebate that keeps
 * total income up to ₹12,00,000 tax-free (rebate capped at ₹60,000). Users can
 * override any figure; `TaxConfigStore.reset()` restores exactly this.
 */
export const DEFAULT_TAX_CONFIG: TaxConfig = {
  fyLabel: 'FY 2025-26',
  cessRate: 0.04,
  caps: {
    section80C: 150_000,
    insurance: 25_000,
  },
  old: {
    slabs: [
      { minLimit: 0, maxLimit: 250_000, percent: 0 },
      { minLimit: 250_000, maxLimit: 500_000, percent: 5 },
      { minLimit: 500_000, maxLimit: 1_000_000, percent: 20 },
      { minLimit: 1_000_000, maxLimit: -1, percent: 30 },
    ],
    standardDeduction: 50_000,
    rebateLimit: 500_000, // 87A: total income ≤ ₹5L → rebate up to ₹12,500
    rebateMaxAmount: 12_500,
  },
  new: {
    slabs: [
      { minLimit: 0, maxLimit: 400_000, percent: 0 },
      { minLimit: 400_000, maxLimit: 800_000, percent: 5 },
      { minLimit: 800_000, maxLimit: 1_200_000, percent: 10 },
      { minLimit: 1_200_000, maxLimit: 1_600_000, percent: 15 },
      { minLimit: 1_600_000, maxLimit: 2_000_000, percent: 20 },
      { minLimit: 2_000_000, maxLimit: 2_400_000, percent: 25 },
      { minLimit: 2_400_000, maxLimit: -1, percent: 30 },
    ],
    standardDeduction: 75_000,
    rebateLimit: 1_200_000, // 87A: total income ≤ ₹12L → rebate up to ₹60,000
    rebateMaxAmount: 60_000,
  },
};

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

/** Shared engine: given the deduction lines and a regime's rules, produce the result. */
function computeTax(
  regime: TaxRegime,
  gross: number,
  deductions: DeductionLine[],
  rules: RegimeRules,
  cessRate: number,
): TaxResult {
  const grossIncome = nonNeg(gross);
  const totalDeductions = deductions.reduce((sum, line) => sum + line.amount, 0);
  const netTaxableIncome = Math.max(0, grossIncome - totalDeductions);
  const slabs = applySlabs(netTaxableIncome, rules.slabs);
  const rawTax = slabs.reduce((sum, slab) => sum + slab.tax, 0);
  // Section 87A rebate: capped rebate when net taxable income is within the limit.
  const rebate =
    rules.rebateLimit > 0 && netTaxableIncome <= rules.rebateLimit
      ? Math.min(rawTax, nonNeg(rules.rebateMaxAmount))
      : 0;
  const baseTax = rawTax - rebate;
  const cess = baseTax * nonNeg(cessRate);

  return {
    regime,
    grossIncome,
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

export function calculateOldRegimeTax(
  gross: number,
  d: OldRegimeDeductions,
  config: TaxConfig = DEFAULT_TAX_CONFIG,
): TaxResult {
  const deductions: DeductionLine[] = [
    { label: 'Standard Deduction', amount: nonNeg(config.old.standardDeduction) },
    { label: 'PF Employer Contribution', amount: nonNeg(d.pfEmployerContribution) },
    { label: '80C Investments', amount: cap(d.section80CInvestments, config.caps.section80C) },
    { label: 'Personal Insurance (80D)', amount: cap(d.personalInsurance, config.caps.insurance) },
    { label: 'Parent Insurance (80D)', amount: cap(d.parentInsurance, config.caps.insurance) },
  ];
  return computeTax('old', gross, deductions, config.old, config.cessRate);
}

export function calculateNewRegimeTax(
  gross: number,
  config: TaxConfig = DEFAULT_TAX_CONFIG,
): TaxResult {
  const deductions: DeductionLine[] = [
    { label: 'Standard Deduction', amount: nonNeg(config.new.standardDeduction) },
  ];
  return computeTax('new', gross, deductions, config.new, config.cessRate);
}

export function calculateTax(
  regime: TaxRegime,
  gross: number,
  deductions: OldRegimeDeductions,
  config: TaxConfig = DEFAULT_TAX_CONFIG,
): TaxResult {
  return regime === 'new'
    ? calculateNewRegimeTax(gross, config)
    : calculateOldRegimeTax(gross, deductions, config);
}
