import { calculateEmi } from './emi.model';

describe('calculateEmi', () => {
  it('matches the reference EMI for ₹10,00,000 @ 8.5% over 20 years', () => {
    const r = calculateEmi({ principal: 1_000_000, annualRatePct: 8.5, tenureMonths: 240 });
    // Standard EMI formula reference ≈ ₹8,678.23/month.
    expect(r.emi).toBeCloseTo(8678.23, 1);
    expect(r.schedule).toHaveLength(240);
    expect(r.years).toHaveLength(20);
  });

  it('handles a 0% interest loan as equal principal instalments', () => {
    const r = calculateEmi({ principal: 120_000, annualRatePct: 0, tenureMonths: 12 });
    expect(r.emi).toBe(10_000);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPayment).toBe(120_000);
  });

  it('pays the balance down to exactly zero on the final month', () => {
    const r = calculateEmi({ principal: 500_000, annualRatePct: 9.75, tenureMonths: 60 });
    expect(r.schedule[r.schedule.length - 1].balance).toBe(0);
  });

  it('keeps total interest = total payment − principal', () => {
    const principal = 750_000;
    const r = calculateEmi({ principal, annualRatePct: 7.25, tenureMonths: 84 });
    expect(r.totalPayment).toBeCloseTo(principal + r.totalInterest, 2);
    const summedInterest = r.schedule.reduce((s, row) => s + row.interest, 0);
    expect(summedInterest).toBeCloseTo(r.totalInterest, 2);
  });

  it('groups months into years with a partial final year', () => {
    const r = calculateEmi({ principal: 200_000, annualRatePct: 10, tenureMonths: 30 });
    expect(r.years).toHaveLength(3);
    expect(r.years[0].months).toHaveLength(12);
    expect(r.years[2].months).toHaveLength(6);
    // Per-year principal repayments should sum back to the full principal.
    const repaid = r.years.reduce((s, y) => s + y.principal, 0);
    expect(repaid).toBeCloseTo(200_000, 2);
  });

  it('returns a zeroed result for invalid inputs', () => {
    expect(calculateEmi({ principal: 0, annualRatePct: 8, tenureMonths: 12 }).emi).toBe(0);
    expect(calculateEmi({ principal: 100_000, annualRatePct: 8, tenureMonths: 0 }).emi).toBe(0);
    expect(
      calculateEmi({ principal: -5, annualRatePct: 8, tenureMonths: 12 }).schedule,
    ).toHaveLength(0);
  });
});
