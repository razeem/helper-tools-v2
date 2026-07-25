import {
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  DEFAULT_OLD_REGIME_DEDUCTIONS,
} from './tax.model';

describe('calculateOldRegimeTax', () => {
  it('matches the reference for ₹12,00,000 with no extra deductions', () => {
    const r = calculateOldRegimeTax(1_200_000, DEFAULT_OLD_REGIME_DEDUCTIONS);
    expect(r.netTaxableIncome).toBe(1_150_000);
    expect(r.baseTax).toBe(157_500);
    expect(r.totalTax).toBeCloseTo(163_800, 5);
  });

  it('caps 80C and 80D deductions', () => {
    const r = calculateOldRegimeTax(2_000_000, {
      section80CInvestments: 500_000,
      pfEmployerContribution: 0,
      personalInsurance: 100_000,
      parentInsurance: 100_000,
    });
    expect(r.deductions.find((d) => d.label.startsWith('80C'))?.amount).toBe(150_000);
    expect(r.deductions.find((d) => d.label.startsWith('Personal'))?.amount).toBe(25_000);
  });
});

describe('calculateNewRegimeTax', () => {
  it('applies the concessional slabs + ₹75k standard deduction', () => {
    const r = calculateNewRegimeTax(1_200_000);
    expect(r.netTaxableIncome).toBe(1_125_000);
    expect(r.baseTax).toBe(68_750);
    expect(r.rebate).toBe(0);
    expect(r.totalTax).toBeCloseTo(71_500, 5);
  });

  it('fully rebates tax at or below the 87A limit (₹7,00,000 income)', () => {
    const r = calculateNewRegimeTax(700_000);
    expect(r.netTaxableIncome).toBe(625_000);
    expect(r.rebate).toBeGreaterThan(0);
    expect(r.totalTax).toBe(0);
  });

  it('taxes income above the rebate limit', () => {
    const r = calculateNewRegimeTax(800_000);
    expect(r.netTaxableIncome).toBe(725_000);
    expect(r.baseTax).toBe(22_500);
    expect(r.totalTax).toBeCloseTo(23_400, 5);
  });
});
