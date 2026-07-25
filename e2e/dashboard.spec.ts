import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('redirects to the dashboard and lists tools', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId('card-income-tax')).toBeVisible();
  await expect(page.getByTestId('card-profile')).toBeVisible();
});

test('navigates to a tool from a dashboard card', async ({ page }) => {
  await page.getByTestId('card-income-tax').click();
  await expect(page).toHaveURL(/\/income-tax$/);
  await expect(page.getByTestId('tax-total')).toBeVisible();
});

test('sidenav links navigate between tools', async ({ page }) => {
  await page.getByTestId('nav-profile').click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByTestId('nav-income-tax').click();
  await expect(page).toHaveURL(/\/income-tax$/);
});
