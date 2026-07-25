import {
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  DEFAULT_OLD_REGIME_DEDUCTIONS,
  DEFAULT_TAX_CONFIG,
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

describe('calculateNewRegimeTax (FY 2025-26 defaults)', () => {
  it('applies the concessional slabs + ₹75k standard deduction', () => {
    const r = calculateNewRegimeTax(1_300_000);
    // 1,300,000 − 75,000 SD = 1,225,000 net taxable (above the ₹12L rebate limit).
    expect(r.netTaxableIncome).toBe(1_225_000);
    // 4–8L @5% = 20,000; 8–12L @10% = 40,000; 12–12.25L @15% = 3,750.
    expect(r.baseTax).toBe(63_750);
    expect(r.rebate).toBe(0);
    expect(r.totalTax).toBeCloseTo(66_300, 5); // + 4% cess
  });

  it('fully rebates tax when total income stays within ₹12,00,000', () => {
    const r = calculateNewRegimeTax(1_200_000);
    expect(r.netTaxableIncome).toBe(1_125_000);
    expect(r.rebate).toBe(52_500);
    expect(r.totalTax).toBe(0);
  });

  it('taxes income above the rebate limit', () => {
    const r = calculateNewRegimeTax(1_300_000);
    expect(r.baseTax).toBeGreaterThan(0);
    expect(r.totalTax).toBeGreaterThan(0);
  });
});

describe('tax model — edge cases', () => {
  it('is zero tax for zero income (both regimes)', () => {
    expect(calculateOldRegimeTax(0, DEFAULT_OLD_REGIME_DEDUCTIONS).totalTax).toBe(0);
    expect(calculateNewRegimeTax(0).totalTax).toBe(0);
  });

  it('clamps negative income to zero tax (both regimes)', () => {
    expect(calculateOldRegimeTax(-500_000, DEFAULT_OLD_REGIME_DEDUCTIONS).totalTax).toBe(0);
    expect(calculateNewRegimeTax(-500_000).totalTax).toBe(0);
  });

  it('adds exactly 4% cess on top of the base tax (old regime)', () => {
    const r = calculateOldRegimeTax(1_200_000, DEFAULT_OLD_REGIME_DEDUCTIONS);
    expect(r.totalTax).toBeCloseTo(r.baseTax * 1.04, 5);
  });

  it('rebate boundary: fully rebated at the limit, taxed just above it', () => {
    // ₹12,75,000 gross − ₹75k SD = exactly ₹12,00,000 net taxable → fully rebated.
    expect(calculateNewRegimeTax(1_275_000).totalTax).toBe(0);
    // Anything more crosses the ₹12L rebate limit and becomes taxable.
    expect(calculateNewRegimeTax(1_300_000).totalTax).toBeGreaterThan(0);
  });

  it('recomputes when the config changes (e.g. a higher cess)', () => {
    const higherCess = {
      ...DEFAULT_TAX_CONFIG,
      cessRate: 0.1,
    };
    const base = calculateNewRegimeTax(1_300_000);
    const bumped = calculateNewRegimeTax(1_300_000, higherCess);
    expect(bumped.cess).toBeGreaterThan(base.cess);
    expect(bumped.baseTax).toBe(base.baseTax); // only cess changed
    expect(bumped.totalTax).toBeCloseTo(base.baseTax * 1.1, 5);
  });
});
