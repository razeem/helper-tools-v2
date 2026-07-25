import { test, expect } from '@playwright/test';

// In-page tabs (Income + Tax) are deep-linkable through a `?tab=` query param:
// you can land on a specific tab by URL, switching a tab rewrites the URL, and
// the selection survives a reload. Unknown slugs fall back to the first tab.

test.describe('Income tabs', () => {
  test('deep-links straight to a tab by URL', async ({ page }) => {
    await page.goto('/income?tab=ideas');
    await expect(page.getByTestId('add-idea')).toBeVisible();

    await page.goto('/income?tab=goals');
    await expect(page.getByTestId('add-must-have')).toBeVisible();

    await page.goto('/income'); // no param → first tab (Minimum Income)
    await expect(page.getByTestId('income-gross')).toBeVisible();
  });

  test('switching a tab rewrites the URL', async ({ page }) => {
    await page.goto('/income');
    await page.getByRole('tab', { name: 'Idea Generator' }).click();
    await expect(page).toHaveURL(/[?&]tab=ideas/);

    await page.getByRole('tab', { name: 'Goals' }).click();
    await expect(page).toHaveURL(/[?&]tab=goals/);
  });

  test('the selected tab survives a reload', async ({ page }) => {
    await page.goto('/income');
    await page.getByRole('tab', { name: 'Idea Generator' }).click();
    await expect(page).toHaveURL(/[?&]tab=ideas/);
    await page.reload();
    await expect(page.getByTestId('add-idea')).toBeVisible();
  });

  test('an unknown tab slug falls back to the first tab', async ({ page }) => {
    await page.goto('/income?tab=bogus');
    await expect(page.getByTestId('income-gross')).toBeVisible();
  });
});

test.describe('Tax tabs', () => {
  test('deep-links to the regime comparer and rewrites the URL on switch', async ({ page }) => {
    await page.goto('/tax?tab=comparer');
    await expect(page.getByTestId('compare-recommendation')).toBeVisible();

    await page.goto('/tax');
    await page.getByRole('tab', { name: 'Regime comparer' }).click();
    await expect(page).toHaveURL(/[?&]tab=comparer/);
  });
});
