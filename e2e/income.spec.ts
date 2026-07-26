import { test, expect, Locator } from '@playwright/test';

// Comprehensive coverage of the Income pillar: the Minimum Income tab (owns
// gross + short-term savings), the Goals tab, and the ICER Idea Generator —
// including the regression for "editing one rating changes/reorders other rows".

// The four ICER axis columns render in this order inside every row.
const AXIS = { interest: 0, capability: 1, effortlessness: 2, return: 3 } as const;

/** The rating radiogroup for `axis` inside idea row `rowIndex`. */
function axisGroup(page: import('@playwright/test').Page, rowIndex: number, axis: keyof typeof AXIS): Locator {
  return page.getByTestId('icer-row').nth(rowIndex).getByRole('radiogroup').nth(AXIS[axis]);
}

/** Set a 1–5 rating by clicking the matching dot (dot N is the Nth radio). */
async function setRating(group: Locator, value: number): Promise<void> {
  await group.getByRole('radio').nth(value - 1).click();
}

test.describe('Income · Minimum Income', () => {
  test('owns gross + short-term savings and derives the minimum breakdown', async ({ page }) => {
    await page.goto('/income');
    await page.getByTestId('income-gross').fill('1200000');
    await page.getByTestId('income-short-term-savings').fill('50000');

    // Derived tiles react without any re-entry.
    await expect(page.getByTestId('income-minimum')).toBeVisible();
    await expect(page.getByTestId('income-surplus')).toBeVisible();
  });

  test('clearing gross falls back to zero, not NaN', async ({ page }) => {
    await page.goto('/income');
    await page.getByTestId('income-gross').fill('900000');
    await page.getByTestId('income-gross').fill('');
    // The derived net-income tile must never show NaN.
    await expect(page.locator('body')).not.toContainText('NaN');
  });

  test('income tax auto-updates on the Income page as gross changes', async ({ page }) => {
    await page.goto('/income');
    // ₹1,00,000/mo → ₹12,00,000/yr → old-regime tax ₹1,63,800/yr → ₹13,650/mo.
    await page.getByTestId('income-gross').fill('100000');
    await expect(page.getByTestId('income-tax')).toContainText('13,650');
    // Change income → the tax tile recomputes live, no navigation needed.
    await page.getByTestId('income-gross').fill('50000'); // ₹6,00,000/yr → ₹1,950/mo
    await expect(page.getByTestId('income-tax')).toContainText('1,950');
  });

  test('12-month breakdown: a bonus lifts the annual total (Apr→Mar FY)', async ({ page }) => {
    await page.goto('/income');
    await page.getByTestId('income-gross').fill('100000'); // fills all 12 months → ₹12L/yr

    await page.getByRole('button', { name: /Advanced/ }).click();
    await expect(page.getByTestId('month-base-0')).toBeVisible();
    await expect(page.getByTestId('salary-annual-total')).toContainText('12,00,000');

    // Add a ₹3,00,000 March bonus (index 11) → annual total ₹15,00,000.
    await page.getByTestId('month-bonus-11').fill('300000');
    await expect(page.getByTestId('salary-annual-total')).toContainText('15,00,000');
  });
});

test.describe('Income · Goals', () => {
  test('seeds default goals and supports add + remove on both lists', async ({ page }) => {
    await page.goto('/income?tab=goals');
    await expect(page.getByTestId('goal-must-have').first()).toBeVisible();
    await expect(page.getByTestId('goal-must-have')).toHaveCount(3);

    await page.getByTestId('add-must-have').click();
    await expect(page.getByTestId('goal-must-have')).toHaveCount(4);

    await page.getByTestId('goal-must-have-remove').first().click();
    await expect(page.getByTestId('goal-must-have')).toHaveCount(3);

    await page.getByTestId('add-good-to-have').click();
    await expect(page.getByTestId('goal-good-to-have').last()).toBeVisible();
  });
});

test.describe('Income · ICER Idea Generator', () => {
  test('adds an idea seeded at a 3.00 score', async ({ page }) => {
    await page.goto('/income?tab=ideas');
    await page.getByTestId('add-idea').click();
    await expect(page.getByTestId('icer-row')).toHaveCount(1);
    await page.getByTestId('icer-name').first().fill('Freelance design');
    // Default axes are all 3 → average 3.00.
    await expect(page.getByTestId('icer-score').first()).toContainText('3.00');
  });

  // Regression: the reported bug — changing one row's rating must not change or
  // reorder any other row.
  test('editing one idea rating leaves other rows untouched and in place', async ({ page }) => {
    await page.goto('/income?tab=ideas');
    await page.getByTestId('add-idea').click();
    await page.getByTestId('add-idea').click();
    await page.getByTestId('icer-name').nth(0).fill('Alpha');
    await page.getByTestId('icer-name').nth(1).fill('Beta');

    // Bump Beta's Interest to 5.
    await setRating(axisGroup(page, 1, 'interest'), 5);

    // Rows keep their order and identity (no live re-sort jump).
    await expect(page.getByTestId('icer-name').nth(0)).toHaveValue('Alpha');
    await expect(page.getByTestId('icer-name').nth(1)).toHaveValue('Beta');

    // Alpha's Interest is still 3 (dot 3 checked, dot 5 not).
    await expect(axisGroup(page, 0, 'interest').getByRole('radio').nth(4)).toHaveAttribute('aria-checked', 'false');
    await expect(axisGroup(page, 0, 'interest').getByRole('radio').nth(2)).toHaveAttribute('aria-checked', 'true');

    // Only Beta's score moved: (5+3+3+3)/4 = 3.50; Alpha stays 3.00.
    await expect(page.getByTestId('icer-row').nth(0).getByTestId('icer-score')).toContainText('3.00');
    await expect(page.getByTestId('icer-row').nth(1).getByTestId('icer-score')).toContainText('3.50');
  });

  test('sorting is a snapshot: a header sorts once, later edits do not reorder', async ({ page }) => {
    await page.goto('/income?tab=ideas');
    await page.getByTestId('add-idea').click();
    await page.getByTestId('add-idea').click();
    await page.getByTestId('icer-name').nth(0).fill('Low');
    await page.getByTestId('icer-name').nth(1).fill('High');

    // Make "High" the top scorer: all four axes = 5.
    for (const axis of Object.keys(AXIS) as (keyof typeof AXIS)[]) {
      await setRating(axisGroup(page, 1, axis), 5);
    }

    // Sort by Score → High rises to the top.
    await page.getByTestId('icer-sort-score').click();
    await expect(page.getByTestId('icer-name').nth(0)).toHaveValue('High');
    await expect(page.getByTestId('icer-name').nth(1)).toHaveValue('Low');

    // Drop the (now top) High row's Interest to 1 — it must stay put, not re-sort.
    await setRating(axisGroup(page, 0, 'interest'), 1);
    await expect(page.getByTestId('icer-name').nth(0)).toHaveValue('High');
    await expect(page.getByTestId('icer-name').nth(1)).toHaveValue('Low');
  });

  test('removing an idea drops its row', async ({ page }) => {
    await page.goto('/income?tab=ideas');
    await page.getByTestId('add-idea').click();
    await page.getByTestId('add-idea').click();
    await expect(page.getByTestId('icer-row')).toHaveCount(2);
    await page.getByTestId('icer-row').first().getByRole('button', { name: 'Remove idea' }).click();
    await expect(page.getByTestId('icer-row')).toHaveCount(1);
  });

  test('ideas persist across a reload', async ({ page }) => {
    await page.goto('/income?tab=ideas');
    await page.getByTestId('add-idea').click();
    await page.getByTestId('icer-name').first().fill('Consulting');
    await page.waitForTimeout(500); // debounced write-through

    await page.reload();
    await expect(page.getByTestId('icer-name').first()).toHaveValue('Consulting');
  });
});
