import { test, expect } from '@playwright/test';

// Spending pillar: Needs and Wants line-item lists own their rows; totals track
// live, feed the dashboard, and persist. Uses client-side nav so the shared
// singleton store stays alive across pillars (a full reload rehydrates from IDB).

test('adds, edits and removes needs while the total tracks live', async ({ page }) => {
  await page.goto('/spending');

  await page.getByTestId('need-add').click();
  await expect(page.getByTestId('need-value')).toHaveCount(1);
  await page.getByTestId('need-type').first().fill('Rent');
  await page.getByTestId('need-value').first().fill('20000');
  await expect(page.getByTestId('need-total')).toContainText('20,000');
  await expect(page.getByTestId('spending-total-needs')).toContainText('20,000');

  await page.getByTestId('need-add').click();
  await expect(page.getByTestId('need-value')).toHaveCount(2); // wait for the new row
  await page.getByTestId('need-value').nth(1).fill('5000');
  await expect(page.getByTestId('need-total')).toContainText('25,000');

  await page.getByTestId('need-remove').last().click();
  await expect(page.getByTestId('need-value')).toHaveCount(1);
  await expect(page.getByTestId('need-total')).toContainText('20,000');
});

test('clearing a value coerces to zero rather than NaN', async ({ page }) => {
  await page.goto('/spending');
  await page.getByTestId('want-add').click();
  await page.getByTestId('want-value').first().fill('1000');
  await expect(page.getByTestId('want-total')).toContainText('1,000');

  await page.getByTestId('want-value').first().fill('');
  await expect(page.getByTestId('want-total')).toContainText('₹0');
  await expect(page.locator('body')).not.toContainText('NaN');
});

test('needs and wants feed the dashboard aggregate', async ({ page }) => {
  await page.goto('/spending');
  await page.getByTestId('need-add').click();
  await page.getByTestId('need-value').first().fill('20000');
  await page.getByTestId('want-add').click();
  await page.getByTestId('want-value').first().fill('10000');

  await page.getByTestId('nav-dashboard').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId('dashboard-surplus')).toBeVisible();
  // Needs + Wants roll into the Living bucket (+ the default ₹1,850 EPF): ₹31,850.
  await expect(page.getByTestId('alloc-living')).toContainText('31,850');
});

test('needs can be reordered by dragging the handle', async ({ page }) => {
  await page.goto('/spending');
  await page.getByTestId('need-add').click();
  await expect(page.getByTestId('need-value')).toHaveCount(1);
  await page.getByTestId('need-type').first().fill('Rent');
  await page.getByTestId('need-add').click();
  await expect(page.getByTestId('need-value')).toHaveCount(2);
  await page.getByTestId('need-type').nth(1).fill('Food');

  // Drag the 2nd row's handle above the 1st (CDK drag-drop uses pointer events).
  const src = await page.getByTestId('need-drag').nth(1).boundingBox();
  const dst = await page.getByTestId('need-drag').nth(0).boundingBox();
  if (!src || !dst) throw new Error('drag handles not found');
  await page.mouse.move(src.x + 6, src.y + 6);
  await page.mouse.down();
  await page.mouse.move(src.x + 6, src.y - 10, { steps: 6 });
  await page.mouse.move(dst.x + 6, dst.y - 12, { steps: 12 });
  await page.mouse.move(dst.x + 6, dst.y - 18, { steps: 6 });
  await page.mouse.up();

  await expect(page.getByTestId('need-type').first()).toHaveValue('Food');
  await expect(page.getByTestId('need-type').nth(1)).toHaveValue('Rent');
});

test('spending rows persist across a reload', async ({ page }) => {
  await page.goto('/spending');
  await page.getByTestId('need-add').click();
  await page.getByTestId('need-type').first().fill('Groceries');
  await page.getByTestId('need-value').first().fill('12000');
  await page.waitForTimeout(500); // debounced write-through

  await page.reload();
  await expect(page.getByTestId('need-type').first()).toHaveValue('Groceries');
  await expect(page.getByTestId('need-value').first()).toHaveValue('12000');
});
