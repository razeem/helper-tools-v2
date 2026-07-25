import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Seed a known gross via the Income pillar (single source of truth).
  await page.goto('/income');
  await page.getByTestId('income-gross').fill('1200000');
  await page.goto('/tax');
});

test('calculates old-regime tax from the shared gross', async ({ page }) => {
  await expect(page.getByTestId('tax-total-tile')).toContainText('163,800');
});

test('recomputes when a deduction changes', async ({ page }) => {
  await page.getByTestId('tax-section80CInvestments').fill('150000');
  // 1,200,000 − 50,000 SD − 150,000 (80C) = 1,000,000 net taxable.
  await expect(page.getByText(/1,000,000/).first()).toBeVisible();
});

test('regime comparer highlights the cheaper regime', async ({ page }) => {
  await page.getByRole('tab', { name: 'Regime comparer' }).click();
  await expect(page.getByTestId('compare-old')).toContainText('163,800');
  await expect(page.getByTestId('compare-new')).toContainText('71,500');
  await expect(page.getByTestId('compare-recommendation')).toContainText('new');
});

test('switching to the new regime changes the tax', async ({ page }) => {
  await page.getByTestId('tax-regime').getByText('New').click();
  await expect(page.getByTestId('tax-total-tile')).toContainText('71,500');
});
