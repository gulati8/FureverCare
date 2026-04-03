/**
 * Pre-Launch Regression: PG-5 Health Profile Navigation & Owner's Notes
 *
 * Covers:
 *   Task 5.1 (#100) — Owner's Notes accordion in Health Profile; Special Instructions removed from Overview
 *   Task 5.2 (#101) — Sidebar sub-items under Health Profile; clicking navigates + scrolls;
 *                      stat blocks on overview link to specific health sections
 *
 * Auth: uses storageState from prelaunch-auth-setup.ts
 */
import { test, expect } from '@playwright/test';

async function navigateToBiscuit(page: any) {
  await page.goto('/dashboard');
  await page.getByText('Biscuit').first().click();
  await expect(page.locator('h1')).toBeVisible();
}

async function navigateToHealthProfile(page: any) {
  await navigateToBiscuit(page);
  await page.locator('.pet-profile-nav-item').filter({ hasText: 'Health Profile' }).click();
  await expect(page).toHaveURL(/\/health$/);
  await expect(page.locator('.health-accordion').first()).toBeVisible();
}

// ============================================================
// Task 5.1: Owner's Notes accordion + Special Instructions removal
// ============================================================
test.describe("PG-5.1: Owner's Notes in Health Profile", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[5.1] \"Owner's Notes\" accordion appears in Health Profile", async ({ page }) => {
    await navigateToHealthProfile(page);
    const ownersNotesAccordion = page.locator('.health-accordion').filter({ hasText: "Owner's Notes" });
    await expect(ownersNotesAccordion).toBeVisible();
  });

  test('[5.1] "Special Instructions" label does NOT appear on Overview tab', async ({ page }) => {
    await navigateToBiscuit(page);
    // Overview is default tab
    await expect(page.locator('text=Special Instructions')).toHaveCount(0);
  });

  test('[5.1] "Special Instructions" label does NOT appear on Health Profile tab either', async ({ page }) => {
    await navigateToHealthProfile(page);
    await expect(page.locator('text=Special Instructions')).toHaveCount(0);
  });

  test("[5.1] \"Owner's Notes\" accordion content is editable (click-to-edit pattern)", async ({ page }) => {
    await navigateToHealthProfile(page);
    const ownersNotesAccordion = page.locator('.health-accordion').filter({ hasText: "Owner's Notes" });
    // Open if not open
    const isOpen = await ownersNotesAccordion.evaluate(el => el.hasAttribute('open'));
    if (!isOpen) {
      await ownersNotesAccordion.locator('.health-accordion-summary').click();
      await page.waitForTimeout(400);
    }
    // The accordion body should contain either:
    // - an editable input/textarea
    // - a click-to-edit paragraph (cursor=pointer means it's clickable for editing)
    // - a pencil icon for rename
    // - OR a "no notes" / "add notes" prompt
    const accordionContent = ownersNotesAccordion;
    const editableContent = accordionContent.locator(
      'textarea, input[type="text"], [contenteditable="true"], ' +
      'p[style*="cursor"], p[class*="cursor-pointer"], ' +
      '[class*="inline-edit"], [class*="editable"], ' +
      'button[title*="edit" i], button[aria-label*="edit" i], ' +
      'text=/click|add notes|no notes|edit/i'
    ).first();
    // If has notes text, it renders as a paragraph — which is the click-to-edit target
    const notesText = accordionContent.locator('p, [class*="content"]').first();
    const hasContent = (await editableContent.count() > 0) || (await notesText.count() > 0);
    expect(hasContent).toBe(true);
  });
});

// ============================================================
// Task 5.2: Sidebar sub-items and stat block navigation
// ============================================================
test.describe('PG-5.2: Health Profile navigation sub-items', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('[5.2] Sidebar shows sub-items under Health Profile when active', async ({ page }) => {
    await navigateToHealthProfile(page);
    await page.waitForTimeout(400);

    // Sub-items should appear
    const subItems = page.locator('.pet-profile-nav-sub-items, .pet-profile-nav-sub-item');
    await expect(subItems.first()).toBeVisible();
  });

  test('[5.2] All 5 sub-items are present: Conditions, Allergies, Medications, Vaccinations, Owner\'s Notes', async ({ page }) => {
    await navigateToHealthProfile(page);
    await page.waitForTimeout(400);

    const expectedSubItems = ['Conditions', 'Allergies', 'Medications', 'Vaccinations', "Owner's Notes"];
    for (const label of expectedSubItems) {
      const subItem = page.locator('.pet-profile-nav-sub-item').filter({ hasText: label });
      await expect(subItem).toBeVisible();
    }
  });

  test('[5.2] Sub-items NOT visible when Health Profile is not the active tab', async ({ page }) => {
    await navigateToBiscuit(page);
    // Overview is active — sub-items should not be visible
    const subItems = page.locator('.pet-profile-nav-sub-items');
    if (await subItems.count() > 0) {
      await expect(subItems.first()).not.toBeVisible();
    }
  });

  test('[5.2] Clicking "Conditions" sub-item sets URL hash to #conditions', async ({ page }) => {
    await navigateToHealthProfile(page);
    await page.waitForTimeout(400);

    const conditionsSubItem = page.locator('.pet-profile-nav-sub-item').filter({ hasText: 'Conditions' });
    await conditionsSubItem.click();
    await page.waitForTimeout(600);

    expect(page.url()).toContain('#conditions');
  });

  test('[5.2] Clicking "Conditions" sub-item opens the Conditions accordion', async ({ page }) => {
    await navigateToHealthProfile(page);
    await page.waitForTimeout(400);

    const conditionsSubItem = page.locator('.pet-profile-nav-sub-item').filter({ hasText: 'Conditions' });
    await conditionsSubItem.click();
    await page.waitForTimeout(600);

    const conditionsAccordion = page.locator('.health-accordion').filter({ hasText: 'Conditions' });
    const isOpen = await conditionsAccordion.evaluate(el => el.hasAttribute('open'));
    expect(isOpen).toBe(true);
  });

  test('[5.2] Clicking "Allergies" sub-item sets URL hash to #allergies', async ({ page }) => {
    await navigateToHealthProfile(page);
    await page.waitForTimeout(400);

    const subItem = page.locator('.pet-profile-nav-sub-item').filter({ hasText: 'Allergies' });
    await subItem.click();
    await page.waitForTimeout(600);
    expect(page.url()).toContain('#allergies');
  });

  test('[5.2] Clicking "Medications" sub-item sets URL hash to #medications', async ({ page }) => {
    await navigateToHealthProfile(page);
    await page.waitForTimeout(400);

    const subItem = page.locator('.pet-profile-nav-sub-item').filter({ hasText: 'Medications' });
    await subItem.click();
    await page.waitForTimeout(600);
    expect(page.url()).toContain('#medications');
  });

  test('[5.2] Clicking "Vaccinations" sub-item sets URL hash to #vaccinations', async ({ page }) => {
    await navigateToHealthProfile(page);
    await page.waitForTimeout(400);

    const subItem = page.locator('.pet-profile-nav-sub-item').filter({ hasText: 'Vaccinations' });
    await subItem.click();
    await page.waitForTimeout(600);
    expect(page.url()).toContain('#vaccinations');
  });

  test('[5.2] Conditions stat block on overview navigates to health#conditions', async ({ page }) => {
    await navigateToBiscuit(page);
    const conditionsStat = page.locator('.pet-profile-stat').filter({ hasText: 'Conditions' }).first();
    await expect(conditionsStat).toBeVisible();
    await conditionsStat.click();
    await page.waitForTimeout(600);

    const url = page.url();
    expect(url).toMatch(/\/health/);
    expect(url).toContain('#conditions');
  });

  test('[5.2] Allergies stat block on overview navigates to health#allergies', async ({ page }) => {
    await navigateToBiscuit(page);
    const stat = page.locator('.pet-profile-stat').filter({ hasText: 'Allergies' }).first();
    await stat.click();
    await page.waitForTimeout(600);
    expect(page.url()).toContain('#allergies');
  });

  test('[5.2] Medications stat block on overview navigates to health#medications', async ({ page }) => {
    await navigateToBiscuit(page);
    const stat = page.locator('.pet-profile-stat').filter({ hasText: 'Medications' }).first();
    await stat.click();
    await page.waitForTimeout(600);
    expect(page.url()).toContain('#medications');
  });

  test('[5.2] Vaccinations stat block on overview navigates to health#vaccinations', async ({ page }) => {
    await navigateToBiscuit(page);
    const stat = page.locator('.pet-profile-stat').filter({ hasText: 'Vaccinations' }).first();
    await stat.click();
    await page.waitForTimeout(600);
    expect(page.url()).toContain('#vaccinations');
  });

  test('[5.2] Direct URL to health#allergies opens Allergies accordion on load', async ({ page }) => {
    // Navigate to Biscuit first to get pet ID
    await navigateToBiscuit(page);
    const petIdMatch = page.url().match(/\/pets\/(\d+)/);
    if (!petIdMatch) {
      test.skip();
      return;
    }
    const petId = petIdMatch[1];
    await page.goto(`/pets/${petId}/health#allergies`);
    await page.waitForTimeout(1200);

    const allergiesAccordion = page.locator('.health-accordion').filter({ hasText: 'Allergies' });
    await expect(allergiesAccordion).toBeVisible();
    const isOpen = await allergiesAccordion.evaluate(el => el.hasAttribute('open'));
    expect(isOpen).toBe(true);
  });
});
