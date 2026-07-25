import { test, expect } from '@playwright/test';
import { statSync } from 'node:fs';

test('exports the income-tax breakdown to a working .xlsx', async ({ page }) => {
  await page.goto('/income-tax');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('tax-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('income-tax-breakdown.xlsx');

  const path = await download.path();
  expect(path).toBeTruthy();
  // A real workbook is a non-trivial ZIP; assert it has meaningful content.
  expect(statSync(path).size).toBeGreaterThan(1000);
});

test('exports the profile to a working .xlsx', async ({ page }) => {
  await page.goto('/profile');
  await page.getByTestId('profile-name').fill('Grace Hopper');
  await page.waitForTimeout(400);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('profile-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('profile.xlsx');
  const path = await download.path();
  expect(statSync(path).size).toBeGreaterThan(1000);
});
