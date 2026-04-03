/**
 * Pre-Launch Regression: PG-7 Dashboard Pet Card
 *
 * Covers:
 *   Task 7.1 (#109) — No "View profile" text; pet cards are clickable; hover effect
 *
 * Auth: uses storageState from prelaunch-auth-setup.ts
 */
import { test, expect } from '@playwright/test';

// ============================================================
// Task 7.1: Dashboard pet card redesign
// ============================================================
test.describe('PG-7.1: Dashboard pet card', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(800);
  });

  test('[7.1] "View profile" text badge is NOT on pet cards', async ({ page }) => {
    await expect(page.locator('text=View profile')).toHaveCount(0);
  });

  test('[7.1] Pet card links navigate to pet profile', async ({ page }) => {
    const petCardLink = page.locator('a[href*="/pets/"]').first();
    await expect(petCardLink).toBeVisible();
    await petCardLink.click();
    await expect(page).toHaveURL(/\/pets\/\d+/);
  });

  test('[7.1] Clicking pet name navigates to pet profile', async ({ page }) => {
    await page.getByText('Biscuit').first().click();
    await expect(page).toHaveURL(/\/pets\/\d+/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('[7.1] Pet card links have a CSS transition (hover effect)', async ({ page }) => {
    const petCard = page.locator('a[href*="/pets/"]').first();
    await expect(petCard).toBeVisible();
    const hasTransition = await petCard.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.transition !== 'none' && style.transition !== '' && style.transition.length > 0;
    });
    expect(hasTransition).toBe(true);
  });

  test('[7.1] Pet cards have a chevron/arrow SVG (navigation affordance)', async ({ page }) => {
    const petCard = page.locator('a[href*="/pets/"]').first();
    await expect(petCard).toBeVisible();
    // The plan says chevron increased to 24x24
    const chevron = petCard.locator('svg').last();
    await expect(chevron).toBeVisible();
  });

  test('[7.1] Dashboard heading "My Pets" is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my pets/i })).toBeVisible();
  });

  test('[7.1] "Add Pet" button is present on dashboard', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add pet/i })).toBeVisible();
  });

  test('[7.1] No standalone "View profile" button exists within any pet card', async ({ page }) => {
    const cards = page.locator('a[href*="/pets/"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const viewProfile = cards.nth(i).locator('text=View profile, .badge:has-text("View profile")');
      await expect(viewProfile).toHaveCount(0);
    }
  });
});
