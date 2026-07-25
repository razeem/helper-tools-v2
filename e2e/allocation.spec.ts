import { test, expect } from '@playwright/test';

test('spend allocation: dragging a handle (arrow keys) adjusts the target ratio', async ({
  page,
}) => {
  await page.goto('/dashboard');
  // Default target: Living 75 : Safety 15 : Growth 10.
  await expect(page.getByTestId('target-living')).toContainText('75%');
  await expect(page.getByTestId('target-safety')).toContainText('15%');
  await expect(page.getByTestId('target-growth')).toContainText('10%');

  // Nudge the Living/Safety boundary left twice → Living 73, Safety 17, sum stays 100.
  await page.getByTestId('split-handle-1').focus();
  await page.getByTestId('split-handle-1').press('ArrowLeft');
  await page.getByTestId('split-handle-1').press('ArrowLeft');
  await expect(page.getByTestId('target-living')).toContainText('73%');
  await expect(page.getByTestId('target-safety')).toContainText('17%');
  await expect(page.getByTestId('target-growth')).toContainText('10%'); // unchanged
});
