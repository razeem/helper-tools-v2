import { test, expect } from '@playwright/test';

test('adds an income idea and rates it', async ({ page }) => {
  await page.goto('/income');
  await page.getByRole('tab', { name: 'Idea Generator' }).click();

  await page.getByTestId('add-idea').click();
  await expect(page.getByTestId('icer-row')).toHaveCount(1);
  await page.getByTestId('icer-name').first().fill('Freelance design');
  await expect(page.getByTestId('icer-name').first()).toHaveValue('Freelance design');
  // Default score is the average of four 3s = 3.00.
  await expect(page.getByTestId('icer-score').first()).toContainText('3.00');
});

test('ideas persist and can be sorted', async ({ page }) => {
  await page.goto('/income');
  await page.getByRole('tab', { name: 'Idea Generator' }).click();
  await page.getByTestId('add-idea').click();
  await page.getByTestId('icer-name').first().fill('Consulting');
  await page.waitForTimeout(500);

  await page.reload();
  await page.getByRole('tab', { name: 'Idea Generator' }).click();
  await expect(page.getByTestId('icer-name').first()).toHaveValue('Consulting');

  // Clicking the Score header toggles sort without error.
  await page.getByTestId('icer-sort-score').click();
  await expect(page.getByTestId('icer-table')).toBeVisible();
});

test('adds a goal in the Goals tab', async ({ page }) => {
  await page.goto('/income');
  await page.getByRole('tab', { name: 'Goals' }).click();
  // Wait for the lazily-rendered tab body; defaults seed 3 must-have goals.
  await expect(page.getByTestId('goal-must-have').first()).toBeVisible();
  await expect(page.getByTestId('goal-must-have')).toHaveCount(3);
  await page.getByTestId('add-must-have').click();
  await expect(page.getByTestId('goal-must-have')).toHaveCount(4);
});
