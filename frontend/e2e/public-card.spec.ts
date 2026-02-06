import { test, expect } from '@playwright/test';

// Seed share ID from test data
const SEED_SHARE_ID = 'BN2IwUJQ1PNA8-hj32ar9';

test.describe('Public Card', () => {
  test('should access public card without authentication', async ({ page }) => {
    // Navigate directly to public card - no login required
    await page.goto(`/card/${SEED_SHARE_ID}`);

    // Should show the emergency header
    await expect(page.getByText('EMERGENCY PET HEALTH CARD')).toBeVisible();

    // Should not show any login prompt or redirect
    await expect(page).not.toHaveURL(/login/);
  });

  test('should display pet basic information', async ({ page }) => {
    await page.goto(`/card/${SEED_SHARE_ID}`);

    // Wait for the card to load
    await expect(page.getByText('EMERGENCY PET HEALTH CARD')).toBeVisible();

    // Pet name should be displayed in the header section
    const petHeader = page.locator('.bg-primary-600');
    await expect(petHeader).toBeVisible();

    // Should show species (dog/cat emoji or text)
    const speciesText = page.locator('text=/dog|cat|species/i');
    await expect(speciesText.first()).toBeVisible();
  });

  test('should display medical conditions if present', async ({ page }) => {
    await page.goto(`/card/${SEED_SHARE_ID}`);

    // Wait for page to load
    await expect(page.getByText('EMERGENCY PET HEALTH CARD')).toBeVisible();

    // Look for conditions section (orange background)
    const conditionsSection = page.locator('.bg-orange-50');
    if (await conditionsSection.count() > 0) {
      await expect(conditionsSection.first()).toContainText(/Medical Conditions|Condition/i);
    }
  });

  test('should display allergies if present', async ({ page }) => {
    await page.goto(`/card/${SEED_SHARE_ID}`);

    // Wait for page to load
    await expect(page.getByText('EMERGENCY PET HEALTH CARD')).toBeVisible();

    // Look for allergies section (red background)
    const allergiesSection = page.locator('.bg-red-50');
    if (await allergiesSection.count() > 0) {
      await expect(allergiesSection.first()).toContainText(/ALLERGIES|Allerg/i);
    }
  });

  test('should display current medications if present', async ({ page }) => {
    await page.goto(`/card/${SEED_SHARE_ID}`);

    // Wait for page to load
    await expect(page.getByText('EMERGENCY PET HEALTH CARD')).toBeVisible();

    // Look for medications section (blue background)
    const medicationsSection = page.locator('.bg-blue-50');
    if (await medicationsSection.count() > 0) {
      await expect(medicationsSection.first()).toContainText(/Medication/i);
    }
  });

  test('should display owner contact information', async ({ page }) => {
    await page.goto(`/card/${SEED_SHARE_ID}`);

    // Wait for page to load
    await expect(page.getByText('EMERGENCY PET HEALTH CARD')).toBeVisible();

    // Look for Contact Information section
    const contactSection = page.getByText('Contact Information');
    await expect(contactSection).toBeVisible();

    // Owner section should be visible
    await expect(page.getByText('Owner')).toBeVisible();
  });

  test('should display vaccination record if present', async ({ page }) => {
    await page.goto(`/card/${SEED_SHARE_ID}`);

    // Wait for page to load
    await expect(page.getByText('EMERGENCY PET HEALTH CARD')).toBeVisible();

    // Look for vaccination record section
    const vaccinationHeader = page.getByText('Vaccination Record');
    if (await vaccinationHeader.count() > 0) {
      await expect(vaccinationHeader).toBeVisible();
    }
  });

  test('should show FureverCare branding in footer', async ({ page }) => {
    await page.goto(`/card/${SEED_SHARE_ID}`);

    // Wait for page to load
    await expect(page.getByText('EMERGENCY PET HEALTH CARD')).toBeVisible();

    // Footer should show FureverCare branding
    await expect(page.getByText('FureverCare').last()).toBeVisible();
  });

  test('should show error for invalid share ID', async ({ page }) => {
    await page.goto('/card/invalid-share-id-12345');

    // Should show error message
    await expect(page.getByText('Card Not Found')).toBeVisible();
    await expect(page.getByText(/could not be found|removed/i)).toBeVisible();
  });
});
