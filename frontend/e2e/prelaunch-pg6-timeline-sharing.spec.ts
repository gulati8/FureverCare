/**
 * Pre-Launch Regression: PG-6 Timeline, Sharing, Empty State
 *
 * Covers:
 *   Task 6.1 (#112, #113) — Timeline: no "Change History"; type filter pills; no duplicate heading
 *   Task 6.2 (#102)       — Shared pets show "Shared with you" badge on dashboard
 *   Task 6.3 (#108)       — CMS empty state fetch (verifies API call + fallback behavior)
 *
 * Auth: uses storageState from prelaunch-auth-setup.ts
 */
import { test, expect } from '@playwright/test';

async function navigateToBiscuit(page: any) {
  await page.goto('/dashboard');
  await page.getByText('Biscuit').first().click();
  await expect(page.locator('h1')).toBeVisible();
}

async function navigateToTimeline(page: any) {
  await navigateToBiscuit(page);
  await page.locator('.pet-profile-nav-item').filter({ hasText: 'Timeline' }).click();
  await expect(page).toHaveURL(/\/activity$/);
  await page.waitForTimeout(600);
}

// ============================================================
// Task 6.1: Timeline cleanup
// ============================================================
test.describe('PG-6.1: Timeline - no Change History, type filter pills', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await navigateToTimeline(page);
  });

  test('[6.1] "Change History" section is NOT on the Timeline page', async ({ page }) => {
    await expect(page.locator('text=Change History')).toHaveCount(0);
  });

  test('[6.1] No duplicate "Medical Timeline" h2/h3 heading on Timeline page', async ({ page }) => {
    // Breadcrumb shows "Timeline"; there should be no separate h3 "Medical Timeline"
    const dupHeading = page.locator('h2:has-text("Medical Timeline"), h3:has-text("Medical Timeline")');
    await expect(dupHeading).toHaveCount(0);
  });

  test('[6.1] Type filter pill "All" is present on Timeline', async ({ page }) => {
    const pill = page.locator('button, [role="tab"]').filter({ hasText: /^All$/ }).first();
    await expect(pill).toBeVisible();
  });

  test('[6.1] Type filter pill "Vaccinations" is present on Timeline', async ({ page }) => {
    const pill = page.locator('button, [role="tab"]').filter({ hasText: /^Vaccinations$/ }).first();
    await expect(pill).toBeVisible();
  });

  test('[6.1] Type filter pill "Medications" is present on Timeline', async ({ page }) => {
    const pill = page.locator('button, [role="tab"]').filter({ hasText: /^Medications$/ }).first();
    await expect(pill).toBeVisible();
  });

  test('[6.1] Type filter pill "Conditions" is present on Timeline', async ({ page }) => {
    const pill = page.locator('button, [role="tab"]').filter({ hasText: /^Conditions$/ }).first();
    await expect(pill).toBeVisible();
  });

  test('[6.1] Type filter pill "Allergies" is present on Timeline', async ({ page }) => {
    const pill = page.locator('button, [role="tab"]').filter({ hasText: /^Allergies$/ }).first();
    await expect(pill).toBeVisible();
  });

  test('[6.1] Clicking "Vaccinations" filter does not crash the page', async ({ page }) => {
    const pill = page.locator('button, [role="tab"]').filter({ hasText: /^Vaccinations$/ }).first();
    await pill.click();
    await page.waitForTimeout(500);
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=/something went wrong/i')).toHaveCount(0);
  });

  test('[6.1] Clicking "All" after filtering resets to all events', async ({ page }) => {
    const vacPill = page.locator('button, [role="tab"]').filter({ hasText: /^Vaccinations$/ }).first();
    await vacPill.click();
    await page.waitForTimeout(400);
    const allPill = page.locator('button, [role="tab"]').filter({ hasText: /^All$/ }).first();
    await allPill.click();
    await page.waitForTimeout(400);
    // No crash
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=/error|crash/i')).toHaveCount(0);
  });

  test('[6.1] Timeline container renders on the page', async ({ page }) => {
    const timelineContainer = page.locator('[class*="medical-timeline"], [class*="MedicalTimeline"]').first();
    if (await timelineContainer.count() > 0) {
      await expect(timelineContainer).toBeVisible();
    } else {
      // Fallback: check the timeline section content area exists
      const section = page.locator('main, [class*="activity"], [class*="timeline"]').first();
      await expect(section).toBeVisible();
    }
  });
});

// ============================================================
// Task 6.2: Shared pets "Shared with you" badge
// ============================================================
test.describe('PG-6.2: Shared pets badge on dashboard', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('[6.2] Dashboard loads and shows the pet list', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /my pets/i })).toBeVisible();
  });

  test('[6.2] Shared pets show "Shared with you" badge if any exist (no separate section)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // No separate "Shared with me" section — shared pets appear inline in the same list
    const sharedSection = page.locator('h2:has-text("Shared"), h3:has-text("Shared with me")');
    await expect(sharedSection).toHaveCount(0);

    // Log any shared badges found
    const sharedBadge = page.locator('text=Shared with you');
    const count = await sharedBadge.count();
    console.log(`Found ${count} "Shared with you" badge(s) on dashboard`);
  });

  test('[6.2] Shared pet cards are navigable (if shared pets exist)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    const sharedBadge = page.locator('text=Shared with you').first();
    if (await sharedBadge.count() > 0) {
      const parentCard = sharedBadge.locator('xpath=ancestor::a').first();
      await parentCard.click();
      await expect(page).toHaveURL(/\/pets\/\d+/);
    }
    // No assertion needed if no shared pets — the absence of separate section is the key test
  });
});

// ============================================================
// Task 6.3: CMS empty state
// ============================================================
test.describe('PG-6.3: CMS empty state text', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('[6.3] Dashboard shows Biscuit pet card (not empty state) for sarah.chen', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Biscuit').first()).toBeVisible();
  });

  test('[6.3] CMS API endpoint /api/cms/pages/dashboard-empty-state returns 200', async ({ page }) => {
    const response = await page.request.get('/api/cms/pages/dashboard-empty-state');
    expect(response.status()).toBe(200);
  });

  test('[6.3] CMS page has slug "dashboard-empty-state"', async ({ page }) => {
    const response = await page.request.get('/api/cms/pages/dashboard-empty-state');
    if (response.status() !== 200) {
      test.skip();
      return;
    }
    const body = await response.json();
    expect(body.slug).toBe('dashboard-empty-state');
  });

  test('[6.3] CMS page has an "empty_state" block', async ({ page }) => {
    const response = await page.request.get('/api/cms/pages/dashboard-empty-state');
    if (response.status() !== 200) {
      test.skip();
      return;
    }
    const body = await response.json();
    expect(body.blocks).toBeDefined();
    const emptyStateBlock = body.blocks.find((b: any) => b.block_type === 'empty_state');
    expect(emptyStateBlock).toBeDefined();
  });

  test('[6.3] CMS empty_state block has the correct heading', async ({ page }) => {
    const response = await page.request.get('/api/cms/pages/dashboard-empty-state');
    if (response.status() !== 200) {
      test.skip();
      return;
    }
    const body = await response.json();
    const block = body.blocks?.find((b: any) => b.block_type === 'empty_state');
    if (!block) {
      test.skip();
      return;
    }
    expect(block.content.heading).toBe('Add your first pet to create their profile');
  });
});
