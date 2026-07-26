import { test, expect } from '@playwright/test';

// Verifies the single shared model: a value entered in one pillar is consumed by
// the others (no duplicate inputs), and the whole model persists across reloads.
// Uses client-side nav (sidebar links) so the singleton store stays alive — this
// is the real SPA behavior; page.goto() would full-reload and rehydrate from IDB.

test('gross entered in Income flows into Tax without re-entry', async ({ page }) => {
  await page.goto('/income');
  // Monthly gross ₹1,00,000 → annualised ₹12,00,000 for tax.
  await page.getByTestId('income-gross').fill('100000');

  await page.getByTestId('nav-tax').click();
  await expect(page).toHaveURL(/\/tax$/);
  // Annual gross 12,00,000 − 50,000 standard deduction = 11,50,000 net taxable (old regime).
  await expect(page.getByText(/11,50,000/).first()).toBeVisible();
  await expect(page.getByTestId('tax-total-tile')).toBeVisible();

  // Tax has no gross input of its own — it's owned by Income only.
  await expect(page.getByTestId('tax-gross')).toHaveCount(0);
});

test('spending totals feed the dashboard and minimum income', async ({ page }) => {
  await page.goto('/spending');
  await page.getByTestId('need-add').click();
  await page.getByTestId('need-type').first().fill('Rent');
  await page.getByTestId('need-value').first().fill('20000');
  await page.getByTestId('want-add').click();
  await page.getByTestId('want-value').first().fill('10000');

  await expect(page.getByTestId('spending-total-needs')).toContainText('20,000');
  await expect(page.getByTestId('spending-total-wants')).toContainText('10,000');

  await page.getByTestId('nav-income').click();
  // The minimum-income breakdown reads Needs/Wants from Spending (not re-typed).
  await expect(page.getByText('20,000').first()).toBeVisible();
  await expect(page.getByTestId('income-minimum')).toBeVisible();

  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('dashboard-surplus')).toBeVisible();
});

test('the whole model persists across a reload', async ({ page }) => {
  await page.goto('/income');
  await page.getByTestId('income-gross').fill('1500000');

  await page.getByTestId('nav-spending').click();
  await page.getByTestId('need-add').click();
  await page.getByTestId('need-value').first().fill('33000');

  await page.waitForTimeout(500); // let the debounced write-through reach IndexedDB
  await page.reload();

  await expect(page.getByTestId('need-value').first()).toHaveValue('33000');
  await page.getByTestId('nav-income').click();
  await expect(page.getByTestId('income-gross')).toHaveValue('1500000');
});
