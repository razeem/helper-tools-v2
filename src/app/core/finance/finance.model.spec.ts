import {
  DEFAULT_FINANCE_INPUTS,
  deriveFinance,
  FinanceInputs,
  icerScore,
  makeLineItem,
  sumLineItems,
} from './finance.model';

function li(value: number) {
  return { ...makeLineItem('x', value) };
}

describe('sumLineItems', () => {
  it('sums values and ignores non-finite ones', () => {
    expect(sumLineItems([li(10), li(20), li(30)])).toBe(60);
    expect(sumLineItems([])).toBe(0);
  });
});

describe('icerScore', () => {
  it('averages the four axes', () => {
    expect(
      icerScore({ id: 'a', name: 'i', interest: 4, capability: 3, effortlessness: 5, return: 2 }),
    ).toBe(3.5);
  });
});

describe('deriveFinance', () => {
  const inputs: FinanceInputs = {
    ...DEFAULT_FINANCE_INPUTS,
    income: { gross: 1_200_000, shortTermSavings: 5_000 },
    spending: { needs: [li(20_000), li(5_000)], wants: [li(10_000)] },
    loan: { emis: [li(15_000)] },
    insurance: { premiums: [li(2_000)] },
    investing: { contributions: [li(3_000)] },
    tax: { regime: 'old', deductions: DEFAULT_FINANCE_INPUTS.tax.deductions },
  };

  it('rolls loan EMIs into total needs', () => {
    const d = deriveFinance(inputs);
    expect(d.totalLoanEmis).toBe(15_000);
    expect(d.totalNeeds).toBe(40_000); // 25,000 spending + 15,000 EMIs
    expect(d.totalWants).toBe(10_000);
  });

  it('derives tax, net income, minimum income and surplus (old regime)', () => {
    const d = deriveFinance(inputs);
    expect(d.taxPayable).toBeCloseTo(163_800, 5);
    expect(d.netIncome).toBeCloseTo(1_036_200, 5);
    // 40,000 + 10,000 + 5,000 + 2,000 + 3,000 − 163,800
    expect(d.minimumIncome).toBeCloseTo(-103_800, 5);
    expect(d.surplus).toBeCloseTo(1_140_000, 5);
  });

  it('reacts to the selected tax regime', () => {
    const asNew = deriveFinance({ ...inputs, tax: { ...inputs.tax, regime: 'new' } });
    expect(asNew.taxPayable).toBeCloseTo(71_500, 5);
  });
});
