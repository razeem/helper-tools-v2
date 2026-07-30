/**
 * Pure inflation math — the "what will this be worth?" engine.
 *
 * Two directions, both driven by the same compounding factor `(1 + r)^n`:
 *  - **Future cost**: what something that costs `amount` today will cost in
 *    `years` years (prices rise).
 *  - **Present value**: what `amount` received in `years` years is worth in
 *    today's money (purchasing power falls).
 *
 * Kept free of Angular so it can be unit-tested in isolation (see
 * `inflation.model.spec.ts`) and reused by any calculator that needs a
 * real-terms figure (the Inflation Adjuster, the NPS projection). All amounts
 * are in the same (major) currency unit; the caller formats.
 */

export interface InflationInputs {
  /** Amount in today's money. */
  amount: number;
  /** Assumed annual inflation, as a percentage (e.g. 6 for 6%). */
  annualRatePct: number;
  /** Horizon in whole years. */
  years: number;
}

/** One year of the forecast. Year 0 is today (no erosion yet). */
export interface InflationYear {
  /** Years from now (0 = today). */
  year: number;
  /** What today's `amount` will cost by then. */
  futureCost: number;
  /** What `amount` received in that year is worth in today's money. */
  presentValue: number;
  /** Purchasing power lost by then, as a percentage of today's (0–100). */
  erosionPct: number;
}

export interface InflationResult {
  /** Compounding factor `(1 + r)^years`. */
  factor: number;
  /** What today's `amount` will cost at the end of the horizon. */
  futureCost: number;
  /** What `amount` received at the end of the horizon is worth today. */
  presentValue: number;
  /** Extra rupees needed then to buy what `amount` buys today. */
  extraNeeded: number;
  /** Purchasing power lost over the horizon, as a percentage (0–100). */
  erosionPct: number;
  /** Year-by-year forecast, `0 … years` inclusive. */
  rows: InflationYear[];
}

/** Round to 2 decimal places, avoiding binary-float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sanitise a rate into a growth multiplier. Deflation (a negative rate) is
 * allowed, but the multiplier is floored just above zero so `-100%` and below
 * can never produce a zero/negative divisor.
 */
function growth(annualRatePct: number): number {
  const rate = Number(annualRatePct);
  const multiplier = 1 + (Number.isFinite(rate) ? rate : 0) / 100;
  return multiplier > 0.000001 ? multiplier : 0.000001;
}

function horizon(years: number): number {
  const n = Math.floor(Number(years) || 0);
  return n > 0 ? n : 0;
}

/** Compounding factor for `years` of inflation at `annualRatePct`. */
export function inflationFactor(annualRatePct: number, years: number): number {
  return Math.pow(growth(annualRatePct), horizon(years));
}

/** What `amount` (today's money) will cost after `years` of inflation. */
export function inflate(amount: number, annualRatePct: number, years: number): number {
  return round2((Number(amount) || 0) * inflationFactor(annualRatePct, years));
}

/**
 * What `amount`, received `years` from now, is worth in today's money — the
 * headline figure behind "₹10 lakh in 20 years ≈ ₹3.1 lakh today".
 */
export function presentValue(amount: number, annualRatePct: number, years: number): number {
  return round2((Number(amount) || 0) / inflationFactor(annualRatePct, years));
}

/** Purchasing power lost over `years`, as a percentage of today's (0–100). */
export function erosionPct(annualRatePct: number, years: number): number {
  return round2((1 - 1 / inflationFactor(annualRatePct, years)) * 100);
}

/**
 * Project `amount` across the whole horizon, both directions, one row per year.
 * A zero-length horizon still returns the year-0 row so callers can always
 * index a "selected year" without a null check.
 */
export function projectInflation(inputs: InflationInputs): InflationResult {
  const amount = Math.max(0, Number(inputs.amount) || 0);
  const rate = inputs.annualRatePct;
  const years = horizon(inputs.years);

  const rows: InflationYear[] = [];
  for (let year = 0; year <= years; year++) {
    rows.push({
      year,
      futureCost: inflate(amount, rate, year),
      presentValue: presentValue(amount, rate, year),
      erosionPct: erosionPct(rate, year),
    });
  }

  const last = rows[rows.length - 1];
  return {
    factor: inflationFactor(rate, years),
    futureCost: last.futureCost,
    presentValue: last.presentValue,
    extraNeeded: round2(last.futureCost - amount),
    erosionPct: last.erosionPct,
    rows,
  };
}
