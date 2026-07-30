import {
  erosionPct,
  inflate,
  inflationFactor,
  presentValue,
  projectInflation,
} from './inflation.model';

describe('inflation helpers', () => {
  it('compounds the factor over whole years', () => {
    expect(inflationFactor(6, 1)).toBeCloseTo(1.06, 6);
    expect(inflationFactor(6, 20)).toBeCloseTo(Math.pow(1.06, 20), 6);
    expect(inflationFactor(6, 0)).toBe(1);
  });

  it('inflates a cost forward', () => {
    // ₹1,00,000 today @ 6% for 10 years ≈ ₹1,79,085.
    expect(inflate(100_000, 6, 10)).toBeCloseTo(179_084.77, 1);
  });

  it('discounts a future amount back to today (the headline claim)', () => {
    // ₹10 lakh received in 20 years @ 6% is worth ≈ ₹3.12 lakh today.
    expect(presentValue(1_000_000, 6, 20)).toBeCloseTo(311_804.73, 1);
  });

  it('is symmetric: inflating then discounting returns the original', () => {
    const forward = inflate(250_000, 7.5, 15);
    expect(presentValue(forward, 7.5, 15)).toBeCloseTo(250_000, 0);
  });

  it('reports purchasing power lost', () => {
    expect(erosionPct(6, 0)).toBe(0);
    expect(erosionPct(6, 20)).toBeCloseTo(68.82, 1);
    // A total loss is approached, never quite reached.
    expect(erosionPct(6, 100)).toBeCloseTo(99.71, 1);
    expect(erosionPct(6, 100)).toBeLessThan(100);
  });

  it('treats a zero rate as no change in either direction', () => {
    expect(inflate(500_000, 0, 30)).toBe(500_000);
    expect(presentValue(500_000, 0, 30)).toBe(500_000);
    expect(erosionPct(0, 30)).toBe(0);
  });

  it('handles deflation (a negative rate) without dividing by zero', () => {
    expect(inflate(100_000, -5, 10)).toBeCloseTo(59_873.69, 1);
    expect(presentValue(100_000, -5, 10)).toBeCloseTo(167_018.26, 1);
    // Clamped well below -100%: finite, not NaN/Infinity.
    expect(Number.isFinite(inflate(100_000, -500, 10))).toBe(true);
    expect(Number.isFinite(presentValue(100_000, -500, 10))).toBe(true);
  });
});

describe('projectInflation', () => {
  it('returns one row per year, inclusive of today', () => {
    const r = projectInflation({ amount: 1_000_000, annualRatePct: 6, years: 20 });
    expect(r.rows).toHaveLength(21);
    expect(r.rows[0]).toEqual({
      year: 0,
      futureCost: 1_000_000,
      presentValue: 1_000_000,
      erosionPct: 0,
    });
    expect(r.rows[20].year).toBe(20);
  });

  it('summarises the end of the horizon', () => {
    const r = projectInflation({ amount: 1_000_000, annualRatePct: 6, years: 20 });
    expect(r.futureCost).toBeCloseTo(3_207_135.47, 0);
    expect(r.presentValue).toBeCloseTo(311_804.73, 0);
    expect(r.extraNeeded).toBeCloseTo(r.futureCost - 1_000_000, 2);
    expect(r.erosionPct).toBeCloseTo(68.82, 1);
    expect(r.factor).toBeCloseTo(3.2071, 3);
  });

  it('rows grow monotonically with a positive rate', () => {
    const r = projectInflation({ amount: 50_000, annualRatePct: 5, years: 10 });
    for (let i = 1; i < r.rows.length; i++) {
      expect(r.rows[i].futureCost).toBeGreaterThan(r.rows[i - 1].futureCost);
      expect(r.rows[i].presentValue).toBeLessThan(r.rows[i - 1].presentValue);
    }
  });

  it('always returns the year-0 row, even for an empty or invalid horizon', () => {
    expect(projectInflation({ amount: 1000, annualRatePct: 6, years: 0 }).rows).toHaveLength(1);
    expect(projectInflation({ amount: 1000, annualRatePct: 6, years: -5 }).rows).toHaveLength(1);
    const zero = projectInflation({ amount: -1000, annualRatePct: 6, years: 3 });
    expect(zero.futureCost).toBe(0);
    expect(zero.presentValue).toBe(0);
  });
});
