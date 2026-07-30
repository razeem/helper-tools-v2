import { calculateNps, MIN_ANNUITY_SHARE_PCT, NpsInputs } from './nps.model';
import { presentValue } from './inflation.model';

const BASE: NpsInputs = {
  monthlyContribution: 5_000,
  currentAge: 30,
  retirementAge: 60,
  expectedReturnPct: 10,
  annuitySharePct: 40,
  annuityRatePct: 6,
  inflationRatePct: 6,
};

/** Closed-form future value of an annuity-due (contribution at start of month). */
function fvAnnuityDue(c: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 12 / 100;
  if (r === 0) return c * months;
  return c * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

describe('calculateNps', () => {
  it('matches the closed-form annuity-due corpus', () => {
    const r = calculateNps(BASE);
    const expected = fvAnnuityDue(5_000, 10, 360);
    expect(r.corpus / expected).toBeCloseTo(1, 6);
    expect(r.years).toBe(30);
    expect(r.months).toBe(360);
  });

  it('tracks what went in versus what it grew to', () => {
    const r = calculateNps(BASE);
    expect(r.totalInvested).toBe(1_800_000);
    expect(r.totalGrowth).toBeCloseTo(r.corpus - r.totalInvested, 2);
    expect(r.corpus).toBeGreaterThan(r.totalInvested);
  });

  it('splits the corpus into annuity and lumpsum, and prices the pension', () => {
    const r = calculateNps({ ...BASE, annuitySharePct: 40, annuityRatePct: 6 });
    expect(r.annuityCorpus).toBeCloseTo(r.corpus * 0.4, 0);
    expect(r.lumpsum).toBeCloseTo(r.corpus * 0.6, 0);
    expect(r.annuityCorpus + r.lumpsum).toBeCloseTo(r.corpus, 0);
    // Pension = annuity corpus × annuity rate ÷ 12.
    expect(r.monthlyPension).toBeCloseTo((r.annuityCorpus * 0.06) / 12, 1);
  });

  it('enforces the 40% minimum annuity share and a 100% ceiling', () => {
    expect(calculateNps({ ...BASE, annuitySharePct: 10 }).annuitySharePct).toBe(
      MIN_ANNUITY_SHARE_PCT,
    );
    expect(calculateNps({ ...BASE, annuitySharePct: 250 }).annuitySharePct).toBe(100);
    const all = calculateNps({ ...BASE, annuitySharePct: 100 });
    expect(all.lumpsum).toBe(0);
    expect(all.annuityCorpus).toBeCloseTo(all.corpus, 2);
  });

  it('reports the payout in today’s money', () => {
    const r = calculateNps(BASE);
    expect(r.real.lumpsum).toBeCloseTo(presentValue(r.lumpsum, 6, 30), 0);
    expect(r.real.monthlyPension).toBeCloseTo(presentValue(r.monthlyPension, 6, 30), 0);
    expect(r.real.lumpsum).toBeLessThan(r.lumpsum);
    expect(r.real.erosionPct).toBeCloseTo(82.59, 1);
  });

  it('leaves the figures untouched when inflation is zero or absent', () => {
    const zero = calculateNps({ ...BASE, inflationRatePct: 0 });
    expect(zero.real.corpus).toBeCloseTo(zero.corpus, 2);
    expect(zero.real.monthlyPension).toBeCloseTo(zero.monthlyPension, 2);
    expect(zero.real.erosionPct).toBe(0);

    const absent = calculateNps({ ...BASE, inflationRatePct: undefined });
    expect(absent.real.corpus).toBeCloseTo(absent.corpus, 2);
  });

  it('builds a contiguous year-by-year schedule', () => {
    const r = calculateNps({ ...BASE, currentAge: 40 });
    expect(r.schedule).toHaveLength(20);
    expect(r.schedule[0].openingBalance).toBe(0);
    expect(r.schedule[0].age).toBe(41);
    expect(r.schedule[19].age).toBe(60);
    expect(r.schedule[19].closingBalance).toBeCloseTo(r.corpus, 2);

    for (let i = 1; i < r.schedule.length; i++) {
      expect(r.schedule[i].openingBalance).toBeCloseTo(r.schedule[i - 1].closingBalance, 0);
    }
    const contributed = r.schedule.reduce((s, y) => s + y.contributed, 0);
    expect(contributed).toBeCloseTo(r.totalInvested, 2);
    // Inflation shrinks each closing balance in real terms.
    expect(r.schedule[19].closingBalanceReal).toBeLessThan(r.schedule[19].closingBalance);
  });

  it('degrades to plain saving at a 0% return', () => {
    const r = calculateNps({ ...BASE, expectedReturnPct: 0 });
    expect(r.corpus).toBe(1_800_000);
    expect(r.totalGrowth).toBe(0);
  });

  it('returns a zeroed result for invalid inputs', () => {
    expect(calculateNps({ ...BASE, monthlyContribution: 0 }).corpus).toBe(0);
    expect(calculateNps({ ...BASE, retirementAge: 30 }).corpus).toBe(0);
    expect(calculateNps({ ...BASE, retirementAge: 25 }).schedule).toHaveLength(0);
    expect(calculateNps({ ...BASE, monthlyContribution: -100 }).monthlyPension).toBe(0);
  });
});
