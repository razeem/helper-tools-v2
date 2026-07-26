/**
 * Pure EMI (Equated Monthly Instalment) math + amortization schedule.
 *
 * Kept free of Angular so it can be unit-tested in isolation (see
 * `emi.model.spec.ts`) and reused wherever the numbers are needed. All amounts
 * are in the same (major) currency unit; the caller formats.
 */

export interface EmiInputs {
  /** Loan principal (amount borrowed). */
  principal: number;
  /** Nominal annual interest rate, as a percentage (e.g. 8.5 for 8.5%). */
  annualRatePct: number;
  /** Loan tenure, in months. */
  tenureMonths: number;
}

/** One month of the amortization schedule. */
export interface AmortRow {
  /** 1-based month index across the whole loan. */
  month: number;
  /** Instalment paid this month (constant, except a tiny final adjustment). */
  emi: number;
  /** Portion of the instalment that reduced the principal. */
  principal: number;
  /** Portion of the instalment that paid interest. */
  interest: number;
  /** Outstanding balance after this month's payment. */
  balance: number;
}

/** A calendar-style year (12 months) of the schedule, with subtotals. */
export interface AmortYear {
  /** 1-based year index. */
  year: number;
  /** Principal repaid across this year. */
  principal: number;
  /** Interest paid across this year. */
  interest: number;
  /** Total paid across this year (principal + interest). */
  total: number;
  /** Outstanding balance at the end of this year. */
  closingBalance: number;
  /** The individual months in this year (1–12 rows). */
  months: AmortRow[];
}

export interface EmiResult {
  /** Monthly instalment. */
  emi: number;
  /** Total interest paid over the life of the loan. */
  totalInterest: number;
  /** Total amount repaid (principal + total interest). */
  totalPayment: number;
  /** Full month-by-month schedule. */
  schedule: AmortRow[];
  /** The same schedule grouped into years, with per-year subtotals. */
  years: AmortYear[];
}

const EMPTY_RESULT: EmiResult = {
  emi: 0,
  totalInterest: 0,
  totalPayment: 0,
  schedule: [],
  years: [],
};

/** Round to 2 decimal places, avoiding binary-float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute the EMI and full amortization schedule for a loan.
 *
 * EMI = P·r·(1+r)^n / ((1+r)^n − 1), where r is the monthly rate and n the
 * number of months. When the rate is 0, it degrades to P/n (equal principal,
 * no interest). Invalid inputs (non-positive principal or tenure) return a
 * zeroed result rather than NaN/Infinity.
 */
export function calculateEmi(inputs: EmiInputs): EmiResult {
  const principal = Number(inputs.principal) || 0;
  const annualRatePct = Number(inputs.annualRatePct) || 0;
  const tenureMonths = Math.floor(Number(inputs.tenureMonths) || 0);

  if (principal <= 0 || tenureMonths <= 0) {
    return EMPTY_RESULT;
  }

  const monthlyRate = annualRatePct / 12 / 100;

  const rawEmi =
    monthlyRate === 0
      ? principal / tenureMonths
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  const emi = round2(rawEmi);

  const schedule: AmortRow[] = [];
  let balance = principal;

  for (let month = 1; month <= tenureMonths; month++) {
    const interest = round2(balance * monthlyRate);

    // On the final month, settle whatever balance remains so it lands exactly
    // at zero — this absorbs the accumulated rounding drift.
    const isLast = month === tenureMonths;
    const principalPaid = isLast ? balance : round2(emi - interest);
    const payment = isLast ? round2(principalPaid + interest) : emi;

    balance = round2(balance - principalPaid);

    schedule.push({
      month,
      emi: payment,
      principal: round2(principalPaid),
      interest,
      balance: balance < 0 ? 0 : balance,
    });
  }

  const totalInterest = round2(schedule.reduce((sum, r) => sum + r.interest, 0));
  const totalPayment = round2(principal + totalInterest);

  return { emi, totalInterest, totalPayment, schedule, years: groupByYear(schedule) };
}

/** Chunk a flat month schedule into years (12 months each) with subtotals. */
function groupByYear(schedule: AmortRow[]): AmortYear[] {
  const years: AmortYear[] = [];

  for (let i = 0; i < schedule.length; i += 12) {
    const months = schedule.slice(i, i + 12);
    years.push({
      year: i / 12 + 1,
      principal: round2(months.reduce((sum, r) => sum + r.principal, 0)),
      interest: round2(months.reduce((sum, r) => sum + r.interest, 0)),
      total: round2(months.reduce((sum, r) => sum + r.emi, 0)),
      closingBalance: months[months.length - 1].balance,
      months,
    });
  }

  return years;
}
