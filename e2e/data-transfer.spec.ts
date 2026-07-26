import { test, expect } from '@playwright/test';

async function openTransferTab(page: import('@playwright/test').Page) {
  await page.getByTestId('avatar-menu').click();
  await page.getByTestId('open-settings').click();
  await page.getByRole('tab', { name: 'Transfer data' }).click();
  await expect(page.getByTestId('transfer-generate')).toBeVisible();
}

test('round-trips the whole model through an export code (replace)', async ({ page }) => {
  // 1. Enter data on this "device".
  await page.goto('/income');
  await page.getByTestId('income-gross').fill('1234567');
  await page.waitForTimeout(500); // let the debounced write settle before export

  // 2. Generate a transfer code and capture it.
  await page.goto('/');
  await openTransferTab(page);
  await page.getByTestId('transfer-generate').click();
  const codeBox = page.getByTestId('transfer-export-code');
  await expect(codeBox).toBeVisible();
  const code = await codeBox.inputValue();
  expect(code.startsWith('PFD1:')).toBe(true);

  // 3. Change the value locally, so restoring the code is observable.
  await page.goto('/income');
  await page.getByTestId('income-gross').fill('7654321');
  await page.waitForTimeout(500);

  // 4. Paste the code and preview it.
  await page.goto('/');
  await openTransferTab(page);
  await page.getByTestId('transfer-import-code').fill(code);
  await page.getByTestId('transfer-preview').click();
  await expect(page.getByTestId('transfer-preview-summary')).toBeVisible();
  await expect(page.getByTestId('transfer-preview-summary')).toContainText('Finance');

  // 5. Import (Replace is the default) — the app reloads on success.
  await page.getByTestId('transfer-mode-replace').click();
  await page.getByTestId('transfer-import-apply').click();
  await page.waitForTimeout(800); // reload + rehydrate

  // 6. The original value is restored.
  await page.goto('/income');
  await expect(page.getByTestId('income-gross')).toHaveValue('1234567');
});

test('shows a friendly error for an invalid code', async ({ page }) => {
  await page.goto('/');
  await openTransferTab(page);
  await page.getByTestId('transfer-import-code').fill('this is not a valid code');
  await page.getByTestId('transfer-preview').click();
  await expect(page.getByTestId('transfer-import-error')).toBeVisible();
  await expect(page.getByTestId('transfer-preview-summary')).toHaveCount(0);
});
