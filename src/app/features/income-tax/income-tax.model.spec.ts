import {
  calculateIncomeTax,
  DEFAULT_INCOME_TAX_INPUT,
  INSURANCE_CAP,
  SECTION_80C_CAP,
} from './income-tax.model';

describe('calculateIncomeTax', () => {
  it('matches the original tool for the default input (₹12,00,000)', () => {
    const result = calculateIncomeTax(DEFAULT_INCOME_TAX_INPUT);
    expect(result.netTaxableIncome).toBe(1_150_000);
    expect(result.baseTax).toBe(157_500);
    expect(result.cess).toBeCloseTo(6_300, 5);
    expect(result.totalTax).toBeCloseTo(163_800, 5);
  });

  it('caps 80C and insurance deductions', () => {
    const result = calculateIncomeTax({
      income: 2_000_000,
      section80CInvestments: 500_000,
      pfEmployerContribution: 0,
      personalInsurance: 100_000,
      parentInsurance: 100_000,
    });
    const eightyC = result.deductions.find((d) => d.label.startsWith('80C'));
    const personal = result.deductions.find((d) => d.label.startsWith('Personal'));
    expect(eightyC?.amount).toBe(SECTION_80C_CAP);
    expect(personal?.amount).toBe(INSURANCE_CAP);
  });

  it('never produces negative slab contributions for low incomes', () => {
    const result = calculateIncomeTax({
      income: 300_000,
      section80CInvestments: 0,
      pfEmployerContribution: 0,
      personalInsurance: 0,
      parentInsurance: 0,
    });
    for (const slab of result.slabs) {
      expect(slab.tax).toBeGreaterThanOrEqual(0);
    }
    // 300k income − 50k standard deduction = 250k taxable → entirely in the 0% slab.
    expect(result.baseTax).toBe(0);
  });
});
