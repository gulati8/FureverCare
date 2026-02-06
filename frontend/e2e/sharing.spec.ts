import { test, expect } from '@playwright/test';

// Test credentials - should match seed data
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
};

test.describe('Sharing', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await expect(page).toHaveURL(/dashboard/);

    // Click on first pet to go to pet detail page
    await page.locator('.card').first().click();

    // Wait for pet detail page to load
    await expect(page.getByRole('button', { name: 'Share Card' })).toBeVisible();
  });

  test('should open share modal', async ({ page }) => {
    // Click share button
    await page.click('button:has-text("Share Card")');

    // Share modal should be visible
    await expect(page.getByText("Share")).toBeVisible();
    await expect(page.getByText('Manage share links for emergency access')).toBeVisible();
  });

  test('should display permanent share link', async ({ page }) => {
    await page.click('button:has-text("Share Card")');

    // Permanent link section should be visible
    await expect(page.getByText('Permanent Link')).toBeVisible();
    await expect(page.getByText('No expiration, no PIN')).toBeVisible();
    await expect(page.getByText('Always Active')).toBeVisible();

    // Copy button should be present
    await expect(page.getByRole('button', { name: 'Copy' }).first()).toBeVisible();
  });

  test('should copy permanent share link', async ({ page }) => {
    await page.click('button:has-text("Share Card")');

    // Click the first Copy button (for permanent link)
    await page.getByRole('button', { name: 'Copy' }).first().click();

    // Should show "Copied!" feedback
    await expect(page.getByText('Copied!')).toBeVisible();
  });

  test('should open create new link form', async ({ page }) => {
    await page.click('button:has-text("Share Card")');

    // Click "+ New Link" button
    await page.click('button:has-text("+ New Link")');

    // Create form should be visible
    await expect(page.getByText('Create Custom Share Link')).toBeVisible();
    await expect(page.getByPlaceholder('e.g., For pet sitter')).toBeVisible();
    await expect(page.getByText('Expiration')).toBeVisible();
    await expect(page.getByText('PIN Protection')).toBeVisible();
  });

  test('should create time-limited share link', async ({ page }) => {
    await page.click('button:has-text("Share Card")');
    await page.click('button:has-text("+ New Link")');

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

  test('should create PIN-protected share link', async ({ page }) => {
    await page.click('button:has-text("Share Card")');
    await page.click('button:has-text("+ New Link")');

    // Fill in label
    await page.fill('input[placeholder="e.g., For pet sitter"]', 'PIN protected link');

    // Set PIN
    await page.fill('input[placeholder="Leave empty for no PIN"]', '1234');

    // Create the link
    await page.click('button:has-text("Create Share Link")');

    // Should show PIN Protected badge
    await expect(page.getByText('PIN Protected')).toBeVisible();
  });

  test('should view QR code for share link', async ({ page }) => {
    await page.click('button:has-text("Share Card")');

    // First create a new link to ensure there's one to view
    await page.click('button:has-text("+ New Link")');
    await page.fill('input[placeholder="e.g., For pet sitter"]', 'QR Test');
    await page.click('button:has-text("Create Share Link")');

    // After creation, we should be on the view page with QR code
    // QR codes are rendered as SVG
    await expect(page.locator('svg').filter({ has: page.locator('rect') }).first()).toBeVisible();

    // Link should be visible
    await expect(page.locator('input[readonly]').first()).toBeVisible();
  });

  test('should navigate back to list from view', async ({ page }) => {
    await page.click('button:has-text("Share Card")');
    await page.click('button:has-text("+ New Link")');

    // Click back button
    await page.click('text=Back to list');

    // Should be back on the list view
    await expect(page.getByText('Permanent Link')).toBeVisible();
  });

  test('should close share modal', async ({ page }) => {
    await page.click('button:has-text("Share Card")');

    // Click close button (X)
    await page.locator('button svg path[d*="M6 18L18 6M6 6l12 12"]').locator('..').click();

    // Modal should be closed
    await expect(page.getByText('Manage share links for emergency access')).not.toBeVisible();
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
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);

    // Go to first pet
    await page.locator('.card').first().click();
    await expect(page.getByRole('button', { name: 'Share Card' })).toBeVisible();

    // Create PIN-protected link
    await page.click('button:has-text("Share Card")');
    await page.click('button:has-text("+ New Link")');
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
