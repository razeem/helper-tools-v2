import { test, expect } from '@playwright/test';

// Playwright gives every test a fresh browser context, so IndexedDB starts empty.

test('shows the default calculation', async ({ page }) => {
  await page.goto('/income-tax');
  await expect(page.getByTestId('tax-income')).toHaveValue('1200000');
  await expect(page.getByTestId('tax-net')).toContainText('1,150,000');
  await expect(page.getByTestId('tax-total')).toContainText('163,800');
});

test('recomputes when inputs change', async ({ page }) => {
  await page.goto('/income-tax');
  await page.getByTestId('tax-income').fill('500000');
  await expect(page.getByTestId('tax-net')).toContainText('450,000');
  await expect(page.getByTestId('tax-total')).toContainText('10,400');
});

test('persists inputs across a reload', async ({ page }) => {
  await page.goto('/income-tax');
  await page.getByTestId('tax-income').fill('750000');
  await expect(page.getByTestId('tax-total')).toContainText('54,600');

  // Give the debounced write-through time to reach IndexedDB, then reload.
  await page.waitForTimeout(500);
  await page.reload();

  await expect(page.getByTestId('tax-income')).toHaveValue('750000');
  await expect(page.getByTestId('tax-total')).toContainText('54,600');
});

test('reset restores defaults', async ({ page }) => {
  await page.goto('/income-tax');
  await page.getByTestId('tax-income').fill('999999');
  await page.getByTestId('tax-reset').click();
  await expect(page.getByTestId('tax-income')).toHaveValue('1200000');
});
