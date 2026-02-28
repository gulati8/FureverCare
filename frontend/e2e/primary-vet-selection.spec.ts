import { test, expect } from '@playwright/test';
import { PetDetailPage } from './pages/PetDetailPage';

const TEST_USER = {
  email: 'sarah.chen@example.com',
  password: 'FureverCare2024!',
};

test.describe('Primary Vet Selection', () => {
  let petDetailPage: PetDetailPage;

  test.beforeEach(async ({ page }) => {
    petDetailPage = new PetDetailPage(page);

    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email address').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Navigate to Biscuit's detail page
    await page.getByText('Biscuit').click();
    await petDetailPage.waitForLoad();
  });

  test('should display primary vet badge for the current primary vet', async ({ page }) => {
    // Navigate to Veterinarians tab
    await page.getByRole('tab', { name: /Veterinarians/i }).click();

    // Wait for vets section to load
    await page.waitForSelector('[data-section="vets"]', { timeout: 5000 });

    // Look for the primary badge (typically shown as a label or badge element)
    const primaryBadge = page.locator('text=/Primary|primary/i').first();

    // Verify at least one vet is marked as primary
    await expect(primaryBadge).toBeVisible({ timeout: 3000 });
  });

  test('should show "Set as Primary" button for non-primary vets', async ({ page }) => {
    // Navigate to Veterinarians tab
    await page.getByRole('tab', { name: /Veterinarians/i }).click();
    await page.waitForSelector('[data-section="vets"]', { timeout: 5000 });

    // Check if there are multiple vets
    const vetCards = page.locator('[data-testid="vet-item"], .vet-card, .border').filter({
      has: page.locator('text=/clinic|vet/i')
    });
    const vetCount = await vetCards.count();

    if (vetCount > 1) {
      // Look for "Set as Primary" button or link
      const setPrimaryButton = page.locator('button:has-text("Set as Primary"), a:has-text("Set as Primary")');

      // Should have at least one "Set as Primary" button (for non-primary vets)
      await expect(setPrimaryButton.first()).toBeVisible({ timeout: 3000 });
    } else {
      // If only one vet, log this for the test report
      console.log('Only one vet found - cannot test multiple vet scenario');
    }
  });

  test('should not show "Set as Primary" button for the current primary vet', async ({ page }) => {
    // Navigate to Veterinarians tab
    await page.getByRole('tab', { name: /Veterinarians/i }).click();
    await page.waitForSelector('[data-section="vets"]', { timeout: 5000 });

    // Find the primary vet card (the one with the Primary badge)
    const primaryVetCard = page.locator('div, section').filter({
      has: page.locator('text=/Primary|primary/i')
    }).first();

    // Verify the primary vet card does NOT have a "Set as Primary" button
    const setPrimaryInPrimaryCard = primaryVetCard.locator('button:has-text("Set as Primary"), a:has-text("Set as Primary")');
    await expect(setPrimaryInPrimaryCard).not.toBeVisible();
  });

  test('should allow setting a different vet as primary', async ({ page }) => {
    // Navigate to Veterinarians tab
    await page.getByRole('tab', { name: /Veterinarians/i }).click();
    await page.waitForSelector('[data-section="vets"]', { timeout: 5000 });

    // Check if we have multiple vets
    const vetCards = page.locator('[data-testid="vet-item"], .vet-card, .border').filter({
      has: page.locator('text=/clinic|vet/i')
    });
    const vetCount = await vetCards.count();

    if (vetCount < 2) {
      // Add a second vet for testing
      const testVetName = `TestVet_${Date.now()}`;

      await petDetailPage.addVet(testVetName, 'Dr. Test', '555-TEST', 'test@vet.com');

      // Wait for the new vet to appear
      await expect(page.getByText(testVetName)).toBeVisible();
    }

    // Find a non-primary vet's "Set as Primary" button
    const setPrimaryButton = page.locator('button:has-text("Set as Primary"), a:has-text("Set as Primary")').first();

    // Get the vet name before clicking (to verify it becomes primary)
    const vetCard = setPrimaryButton.locator('..').locator('..'); // Navigate up to card container
    const vetNameElement = vetCard.locator('text=/clinic|vet/i').first();
    const vetNameBefore = await vetNameElement.textContent();

    // Click "Set as Primary"
    await setPrimaryButton.click();

    // Wait for the UI to update (the button should disappear and badge should appear)
    await page.waitForTimeout(1000); // Give time for state update

    // Verify the vet now has the Primary badge
    if (vetNameBefore) {
      const updatedVetCard = page.locator(`text=${vetNameBefore}`).locator('..').locator('..');
      await expect(updatedVetCard.locator('text=/Primary|primary/i')).toBeVisible({ timeout: 3000 });
    }

    // Verify only ONE vet has the primary badge
    const allPrimaryBadges = page.locator('text=/Primary|primary/i');
    await expect(allPrimaryBadges).toHaveCount(1);
  });

  test('should persist primary vet selection after page reload', async ({ page }) => {
    // Navigate to Veterinarians tab
    await page.getByRole('tab', { name: /Veterinarians/i }).click();
    await page.waitForSelector('[data-section="vets"]', { timeout: 5000 });

    // Ensure we have at least 2 vets
    const vetCards = page.locator('[data-testid="vet-item"], .vet-card, .border').filter({
      has: page.locator('text=/clinic|vet/i')
    });
    const vetCount = await vetCards.count();

    if (vetCount < 2) {
      const testVetName = `PersistTest_${Date.now()}`;
      await petDetailPage.addVet(testVetName, 'Dr. Persist', '555-PRST');
      await expect(page.getByText(testVetName)).toBeVisible();
    }

    // Set a specific vet as primary
    const setPrimaryButton = page.locator('button:has-text("Set as Primary"), a:has-text("Set as Primary")').first();
    const vetCard = setPrimaryButton.locator('..').locator('..');
    const vetName = await vetCard.locator('text=/clinic|vet/i').first().textContent();

    await setPrimaryButton.click();
    await page.waitForTimeout(1000);

    // Reload the page
    await page.reload();
    await petDetailPage.waitForLoad();
    await page.getByRole('tab', { name: /Veterinarians/i }).click();
    await page.waitForSelector('[data-section="vets"]', { timeout: 5000 });

    // Verify the same vet is still primary
    if (vetName) {
      const reloadedVetCard = page.locator(`text=${vetName}`).locator('..').locator('..');
      await expect(reloadedVetCard.locator('text=/Primary|primary/i')).toBeVisible({ timeout: 3000 });
    }
  });
});
