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

test('exports the profile to a working .xlsx from settings', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByTestId('avatar-menu').click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('profile-name').fill('Grace Hopper');
  await page.waitForTimeout(400);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('profile-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('profile.xlsx');
  const path = await download.path();
  expect(statSync(path).size).toBeGreaterThan(1000);
});
