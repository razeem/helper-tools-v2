import { test, expect } from '@playwright/test';
import { statSync } from 'node:fs';

test('exports the tax breakdown to a working .xlsx', async ({ page }) => {
  await page.goto('/income');
  await page.getByTestId('income-gross').fill('1200000');
  await page.goto('/tax');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('tax-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('tax-breakdown.xlsx');
  const path = await download.path();
  expect(statSync(path).size).toBeGreaterThan(1000);
});

test('exports the whole-model workbook from the dashboard', async ({ page }) => {
  // Enter data across pillars, then export one consolidated workbook.
  await page.goto('/income');
  await page.getByTestId('income-gross').fill('1500000');
  await page.getByTestId('nav-spending').click();
  await page.getByTestId('need-add').click();
  await page.getByTestId('need-value').first().fill('20000');

  await page.getByTestId('nav-dashboard').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('dashboard-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('personal-finance.xlsx');
  const path = await download.path();
  expect(statSync(path).size).toBeGreaterThan(1000);
});
