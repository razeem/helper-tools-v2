import { test, expect } from '@playwright/test';

// The tax rulebook is user-editable in Settings → Tax rules, and every edit flows
// through the single shared model into the Tax pillar's computed figures.

test('editing a new-regime slab rate recomputes the tax end-to-end', async ({ page }) => {
  // Monthly gross ₹1,50,000 → ₹18,00,000/yr, above the ₹12L rebate so the new
  // regime actually owes tax (annual new-regime tax ₹1,50,800).
  await page.goto('/income');
  await page.getByTestId('income-gross').fill('150000');

  await page.getByTestId('nav-tax').click();
  await page.getByTestId('tax-regime').getByText('New').click();
  // Baseline with shipped FY 2025-26 slabs.
  await expect(page.getByTestId('tax-total-tile')).toContainText('150,800');

  // Open Settings → Tax rules and bump the 4–8L slab from 5% to 10%.
  await page.getByTestId('avatar-menu').click();
  await page.getByTestId('open-settings').click();
  await page.getByRole('tab', { name: 'Tax rules' }).click();
  await page.getByTestId('slab-new-1-percent').fill('10');
  await page.getByTestId('slab-new-1-percent').blur();
  await page.keyboard.press('Escape'); // close the dialog

  // The extra 5% on the full ₹4L band adds ₹20,000 + 4% cess → ₹1,71,600.
  await expect(page.getByTestId('tax-total-tile')).toContainText('171,600');
});

test('reset restores the shipped defaults', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByTestId('avatar-menu').click();
  await page.getByTestId('open-settings').click();
  await page.getByRole('tab', { name: 'Tax rules' }).click();

  await page.getByTestId('cess-rate').fill('10');
  await page.getByTestId('cess-rate').blur();
  await expect(page.getByTestId('cess-rate')).toHaveValue('10');

  await page.getByTestId('tax-rules-reset').click();
  await expect(page.getByTestId('cess-rate')).toHaveValue('4'); // back to 4%
});

test('tax rules persist across a reload', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByTestId('avatar-menu').click();
  await page.getByTestId('open-settings').click();
  await page.getByRole('tab', { name: 'Tax rules' }).click();
  await page.getByTestId('std-new').fill('100000');
  await page.getByTestId('std-new').blur();
  await page.waitForTimeout(500); // debounced write-through

  await page.reload();
  await page.getByTestId('avatar-menu').click();
  await page.getByTestId('open-settings').click();
  await page.getByRole('tab', { name: 'Tax rules' }).click();
  await expect(page.getByTestId('std-new')).toHaveValue('100000');
});
