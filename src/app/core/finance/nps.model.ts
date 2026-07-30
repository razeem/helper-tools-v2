/**
 * Pure NPS (National Pension System) projection math.
 *
 * Accumulation: a fixed monthly contribution compounded at an expected annual
 * return until retirement. At retirement the corpus splits — a share buys an
 * annuity (which pays the monthly pension), the rest is withdrawn as a tax-free
 * lumpsum. NPS rules require at least 40% of the corpus to go into the annuity.
 *
 * Because the payout is decades away, every headline figure also comes back in
 * **today's money** (`real`), discounted with `inflation.model`. Kept free of
 * Angular so it can be unit-tested in isolation (see `nps.model.spec.ts`).
 */

import { erosionPct, presentValue } from './inflation.model';

/** Statutory floor on the share of the corpus that must buy an annuity. */
export const MIN_ANNUITY_SHARE_PCT = 40;

/** The usual NPS vesting age (Tier-I exit). */
export const NPS_RETIREMENT_AGE = 60;

export interface NpsInputs {
  /** Contribution paid every month until retirement. */
  monthlyContribution: number;
  /** Age today, in whole years. */
  currentAge: number;
  /** Age at which the corpus is drawn (usually 60). */
  retirementAge: number;
  /** Expected annual return on the accumulating corpus, as a percentage. */
  expectedReturnPct: number;
  /** Share of the corpus used to buy the annuity — clamped to 40–100%. */
  annuitySharePct: number;
  /** Expected annual annuity payout rate, as a percentage of the annuity corpus. */
  annuityRatePct: number;
  /** Assumed annual inflation used for the today's-money figures. Defaults to 0. */
  inflationRatePct?: number;
}

/** One year of the accumulation phase. */
export interface NpsYear {
  /** 1-based year of contributing. */
  year: number;
  /** Age at the end of this year. */
  age: number;
  /** Balance carried into this year. */
  openingBalance: number;
  /** Contributions paid in during this year. */
  contributed: number;
  /** Return earned during this year. */
  growth: number;
  /** Balance at the end of this year. */
  closingBalance: number;
  /** That closing balance expressed in today's money. */
  closingBalanceReal: number;
}

/** The same headline figures, discounted to today's money. */
export interface NpsRealTerms {
  corpus: number;
  lumpsum: number;
  monthlyPension: number;
  /** Purchasing power lost over the accumulation years, as a percentage. */
  erosionPct: number;
}

export interface NpsResult {
  /** Years of contributing (retirementAge − currentAge). */
  years: number;
  /** Months of contributing. */
  months: number;
  /** Sum of all contributions paid in. */
  totalInvested: number;
  /** Corpus at retirement. */
  corpus: number;
  /** Corpus − total invested. */
  totalGrowth: number;
  /** Portion of the corpus used to buy the annuity. */
  annuityCorpus: number;
  /** Portion withdrawn at retirement. */
  lumpsum: number;
  /** Pension the annuity corpus pays each month. */
  monthlyPension: number;
  /** The annuity share actually used, after clamping. */
  annuitySharePct: number;
  /** Everything above, in today's money. */
  real: NpsRealTerms;
  /** Year-by-year accumulation schedule. */
  schedule: NpsYear[];
}

const EMPTY_RESULT: NpsResult = {
  years: 0,
  months: 0,
  totalInvested: 0,
  corpus: 0,
  totalGrowth: 0,
  annuityCorpus: 0,
  lumpsum: 0,
  monthlyPension: 0,
  annuitySharePct: MIN_ANNUITY_SHARE_PCT,
  real: { corpus: 0, lumpsum: 0, monthlyPension: 0, erosionPct: 0 },
  schedule: [],
};

/** Round to 2 decimal places, avoiding binary-float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function nonNeg(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function clampSharePct(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return MIN_ANNUITY_SHARE_PCT;
  return Math.min(100, Math.max(MIN_ANNUITY_SHARE_PCT, n));
}

/**
 * Project the corpus, lumpsum and monthly pension for a monthly NPS
 * contribution, plus what each is worth in today's money.
 *
 * The contribution is treated as paid at the **start** of each month (so it
 * earns that month's return), which is how NPS/SIP calculators quote figures.
 * Invalid inputs (no contribution, or retiring at or before the current age)
 * return a zeroed result rather than NaN.
 */
export function calculateNps(inputs: NpsInputs): NpsResult {
  const monthlyContribution = nonNeg(inputs.monthlyContribution);
  const currentAge = Math.floor(nonNeg(inputs.currentAge));
  const retirementAge = Math.floor(nonNeg(inputs.retirementAge));
  const expectedReturnPct = nonNeg(inputs.expectedReturnPct);
  const annuitySharePct = clampSharePct(inputs.annuitySharePct);
  const annuityRatePct = nonNeg(inputs.annuityRatePct);
  const inflationRatePct = Number(inputs.inflationRatePct) || 0;

  const years = retirementAge - currentAge;
  if (monthlyContribution <= 0 || years <= 0) {
    return { ...EMPTY_RESULT, annuitySharePct };
  }

  const months = years * 12;
  const monthlyRate = expectedReturnPct / 12 / 100;

  const schedule: NpsYear[] = [];
  let balance = 0;

  for (let year = 1; year <= years; year++) {
    const openingBalance = balance;
    let contributed = 0;
    let growth = 0;

    for (let month = 0; month < 12; month++) {
      balance += monthlyContribution; // paid at the start of the month
      contributed += monthlyContribution;
      const earned = balance * monthlyRate;
      growth += earned;
      balance += earned;
    }

    schedule.push({
      year,
      age: currentAge + year,
      openingBalance: round2(openingBalance),
      contributed: round2(contributed),
      growth: round2(growth),
      closingBalance: round2(balance),
      closingBalanceReal: presentValue(balance, inflationRatePct, year),
    });
  }

  const corpus = round2(balance);
  const totalInvested = round2(monthlyContribution * months);
  const annuityCorpus = round2((corpus * annuitySharePct) / 100);
  const lumpsum = round2(corpus - annuityCorpus);
  const monthlyPension = round2((annuityCorpus * annuityRatePct) / 100 / 12);

  return {
    years,
    months,
    totalInvested,
    corpus,
    totalGrowth: round2(corpus - totalInvested),
    annuityCorpus,
    lumpsum,
    monthlyPension,
    annuitySharePct,
    real: {
      corpus: presentValue(corpus, inflationRatePct, years),
      lumpsum: presentValue(lumpsum, inflationRatePct, years),
      monthlyPension: presentValue(monthlyPension, inflationRatePct, years),
      erosionPct: erosionPct(inflationRatePct, years),
    },
    schedule,
  };
}
