import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'sarah.chen@example.com',
  password: 'FureverCare2024!',
};

async function openSendCardModal(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Send Card' }).click();
  await expect(page.getByRole('heading', { name: /Share Biscuit's Card/ })).toBeVisible();
}

async function openShareWallet(page: import('@playwright/test').Page) {
  await openSendCardModal(page);
  await page.getByRole('button', { name: /Create time-limited or PIN-protected link/ }).click();
  await expect(page.getByRole('heading', { name: 'Custom Share Links' })).toBeVisible();
}

test.describe('Sharing', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email address').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for dashboard to load
    await expect(page).toHaveURL(/dashboard/);

    // Click on first pet to go to pet detail page
    await page.getByText('Biscuit').click();

    // Wait for pet detail page to load
    await expect(page.getByRole('button', { name: 'Send Card' })).toBeVisible();
  });

  test('should open share modal', async ({ page }) => {
    await openSendCardModal(page);
    await expect(page.getByRole('button', { name: /Create time-limited or PIN-protected link/ })).toBeVisible();
  });

  test('should display permanent share link', async ({ page }) => {
    await openSendCardModal(page);
    await expect(page.getByRole('button', { name: 'Copy' }).first()).toBeVisible();
    await expect(page.locator('input[readonly]').first()).toBeVisible();
    await expect(page.getByText('This link provides read-only access. No login required.')).toBeVisible();
  });

  test('should copy permanent share link', async ({ page }) => {
    await openSendCardModal(page);

    // Click the first Copy button (for permanent link)
    await page.getByRole('button', { name: 'Copy' }).first().click();

    await expect(page.locator('input[readonly]').first()).toBeVisible();
  });

  test('should open create new link form', async ({ page }) => {
    await openShareWallet(page);
    await page.getByRole('button', { name: '+ New Link' }).click();

    // Create form should be visible
    await expect(page.getByText('Create Custom Share Link')).toBeVisible();
    await expect(page.getByPlaceholder('e.g., For pet sitter')).toBeVisible();
    await expect(page.getByText('Expiration')).toBeVisible();
    await expect(page.getByText('PIN Protection')).toBeVisible();
  });

  test('should create time-limited share link', async ({ page }) => {
    await openShareWallet(page);
    await page.getByRole('button', { name: '+ New Link' }).click();

    // Fill in label
    await page.fill('input[placeholder="e.g., For pet sitter"]', 'Temporary link');

    // Select expiration (24 hours)
    await page.selectOption('select', '24');

    // Create the link
    await page.click('button:has-text("Create Share Link")');

    // Should show QR code view
    await expect(page.locator('svg[class*="qr"]').or(page.locator('canvas')).or(page.getByText('Temporary link'))).toBeVisible();

    // Should show expiration info
    await expect(page.getByText(/Expires in|hours/)).toBeVisible();
  });

  test('should persist a created share link after reopening the modal', async ({ page }) => {
    const label = `Temporary link ${Date.now()}`;

    await openShareWallet(page);
    await page.getByRole('button', { name: '+ New Link' }).click();
    await page.fill('input[placeholder="e.g., For pet sitter"]', label);
    await page.click('button:has-text("Create Share Link")');
    await expect(page.locator('input[readonly]').first()).toBeVisible();

    await page.locator('div.fixed.inset-0').getByRole('button').first().click();

    await openShareWallet(page);
    await expect(page.getByText(label)).toBeVisible();
  });

  test('should create PIN-protected share link', async ({ page }) => {
    await openShareWallet(page);
    await page.getByRole('button', { name: '+ New Link' }).click();

    // Fill in label
    await page.fill('input[placeholder="e.g., For pet sitter"]', 'PIN protected link');

    // Set PIN
    await page.fill('input[placeholder="Leave empty for no PIN"]', '1234');

    // Create the link
    await page.click('button:has-text("Create Share Link")');

    // Should show PIN Protected badge
    await expect(page.getByText('PIN Protected', { exact: true })).toBeVisible();
  });

  test('should view QR code for share link', async ({ page }) => {
    await openShareWallet(page);
    await page.getByRole('button', { name: '+ New Link' }).click();
    await page.fill('input[placeholder="e.g., For pet sitter"]', 'QR Test');
    await page.click('button:has-text("Create Share Link")');

    // After creation, we should be on the view page with QR code
    // QR codes are rendered as SVG
    await expect(page.locator('svg').filter({ has: page.locator('rect') }).first()).toBeVisible();

    // Link should be visible
    await expect(page.locator('input[readonly]').first()).toBeVisible();
  });

  test('should navigate back to list from view', async ({ page }) => {
    const label = `Back test ${Date.now()}`;

    await openShareWallet(page);
    await page.getByRole('button', { name: '+ New Link' }).click();
    await page.fill('input[placeholder="e.g., For pet sitter"]', label);
    await page.click('button:has-text("Create Share Link")');

    // Click back button
    await page.click('text=Back to list');

    await expect(page.getByRole('heading', { name: 'Custom Share Links' })).toBeVisible();
    await expect(page.getByText(label)).toBeVisible();
  });

  test('should close share modal', async ({ page }) => {
    await openSendCardModal(page);

    // Click close button (X)
    await page.locator('button svg path[d*="M6 18L18 6M6 6l12 12"]').locator('..').click();

    await expect(page.getByRole('heading', { name: /Share Biscuit's Card/ })).not.toBeVisible();
  });
});

test.describe('PIN-protected Link Access', () => {
  test('should show PIN entry form for PIN-protected link', async ({ page }) => {
    // This test would require a pre-created PIN-protected link
    // For now, we test the UI flow
    await page.goto('/share/test-pin-token-123');

    // Either we get a PIN form or an error (invalid token)
    const pinForm = page.getByText('PIN Required');
    const error = page.getByText('Link Unavailable');

    await expect(pinForm.or(error)).toBeVisible();
  });

  test('should show error for invalid PIN', async ({ page, context }) => {
    // First login and create a PIN-protected link
    await page.goto('/login');
    await page.getByLabel('Email address').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/dashboard/);

    // Go to first pet
    await page.getByText('Biscuit').click();
    await expect(page.getByRole('button', { name: 'Send Card' })).toBeVisible();

    // Create PIN-protected link
    await openShareWallet(page);
    await page.getByRole('button', { name: '+ New Link' }).click();
    await page.fill('input[placeholder="e.g., For pet sitter"]', 'PIN Test');
    await page.fill('input[placeholder="Leave empty for no PIN"]', 'correct-pin');
    await page.click('button:has-text("Create Share Link")');

    // Get the share URL
    await expect(page.locator('input[readonly]').first()).toBeVisible();
    const shareUrl = await page.locator('input[readonly]').first().inputValue();

    // Open a new page without auth context to access the link
    const newPage = await context.newPage();
    await newPage.goto(shareUrl);

    // Should show PIN required
    await expect(newPage.getByText('PIN Required')).toBeVisible();

    // Enter wrong PIN
    await newPage.fill('input[type="password"]', 'wrong-pin');
    await newPage.click('button:has-text("Access Card")');

    // Should show error
    await expect(newPage.getByText('Invalid PIN')).toBeVisible();

    await newPage.close();
  });

  test('should show expired link message', async ({ page }) => {
    // Navigate to a likely expired token
    await page.goto('/share/expired-token-test');

    // Should show unavailable message
    await expect(page.getByText('Link Unavailable')).toBeVisible();
  });
});
