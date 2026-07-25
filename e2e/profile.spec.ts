import { test, expect } from '@playwright/test';

// 16×16 solid PNG used to exercise the canvas → WebP compression path.
const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGO4o2FDEmIY1TCqYfhqAAC/xkAQosL08QAAAABJRU5ErkJggg==',
  'base64',
);

test('persists text fields across a reload', async ({ page }) => {
  await page.goto('/profile');

  await page.getByTestId('profile-name').fill('Ada Lovelace');
  await page.getByTestId('profile-email').fill('ada@example.com');
  await page.getByTestId('profile-city').fill('London');
  await page.getByTestId('profile-notes').fill('First programmer');

  // Allow the debounced write-through to reach IndexedDB.
  await page.waitForTimeout(500);
  await page.reload();

  await expect(page.getByTestId('profile-name')).toHaveValue('Ada Lovelace');
  await expect(page.getByTestId('profile-email')).toHaveValue('ada@example.com');
  await expect(page.getByTestId('profile-city')).toHaveValue('London');
  await expect(page.getByTestId('profile-notes')).toHaveValue('First programmer');
});

test('validates the email field', async ({ page }) => {
  await page.goto('/profile');
  await page.getByTestId('profile-email').fill('not-an-email');
  await page.getByTestId('profile-email').blur();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
});

test('compresses, previews and persists an uploaded photo', async ({ page }) => {
  await page.goto('/profile');

  await page.getByTestId('profile-photo-input').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: SAMPLE_PNG,
  });

  const photo = page.getByTestId('profile-photo');
  await expect(photo).toBeVisible();

  // The stored/preview image is a compressed WebP blob URL.
  const src = await photo.getAttribute('src');
  expect(src).toMatch(/^blob:/);

  await page.waitForTimeout(500);
  await page.reload();

  // Photo survives reload (loaded back from IndexedDB as a Blob).
  await expect(page.getByTestId('profile-photo')).toBeVisible();
});

test('clear removes persisted data', async ({ page }) => {
  await page.goto('/profile');
  await page.getByTestId('profile-name').fill('Temporary');
  await page.waitForTimeout(400);
  await page.getByTestId('profile-reset').click();
  await expect(page.getByTestId('profile-name')).toHaveValue('');

  await page.reload();
  await expect(page.getByTestId('profile-name')).toHaveValue('');
});
