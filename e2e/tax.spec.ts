import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Seed a known gross via the Income pillar (single source of truth).
  // Gross is MONTHLY now: ₹1,00,000/mo → ₹12,00,000/yr (annual old-regime tax ₹1,63,800).
  await page.goto('/income');
  await page.getByTestId('income-gross').fill('100000');
  await page.goto('/tax');
});

test('calculates old-regime tax from the shared gross', async ({ page }) => {
  await expect(page.getByTestId('tax-total-tile')).toContainText('1,63,800');
});

test('recomputes when a deduction changes', async ({ page }) => {
  await page.getByTestId('tax-section80CInvestments').fill('150000');
  // 1,200,000 − 50,000 SD − 150,000 (80C) = 1,000,000 net taxable.
  await expect(page.getByText(/1,000,000/).first()).toBeVisible();
});

test('regime comparer highlights the cheaper regime', async ({ page }) => {
  await page.getByRole('tab', { name: 'Regime comparer' }).click();
  await expect(page.getByTestId('compare-old')).toContainText('1,63,800');
  // FY 2025-26: ₹12L under the new regime is fully rebated to ₹0.
  await expect(page.getByTestId('compare-new')).toContainText('₹0');
  await expect(page.getByTestId('compare-recommendation')).toContainText('new');
});

test('switching to the new regime changes the tax', async ({ page }) => {
  await page.getByTestId('tax-regime').getByText('New').click();
  await expect(page.getByTestId('tax-total-tile')).toContainText('₹0');
});
