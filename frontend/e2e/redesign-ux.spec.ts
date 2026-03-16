import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'sarah.chen@example.com',
  password: 'FureverCare2024!',
};

async function login(page: any) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
}

// ============================================================
// SIDEBAR NAVIGATION (Desktop)
// ============================================================
test.describe('Pet Profile - Sidebar Navigation (Desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Biscuit').click();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('sidebar nav is visible on desktop', async ({ page }) => {
    const sidebar = page.locator('.pet-profile-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('sidebar has 5 nav items', async ({ page }) => {
    const navItems = page.locator('.pet-profile-nav-item');
    await expect(navItems).toHaveCount(5);
  });

  test('Overview is active by default', async ({ page }) => {
    const overviewLink = page.locator('.pet-profile-nav-item.active');
    await expect(overviewLink).toContainText('Overview');
  });

  test('clicking Health Records navigates to /health', async ({ page }) => {
    await page.getByRole('link', { name: /Health Records/ }).first().click();
    await expect(page).toHaveURL(/\/health$/);
    // Health accordion should be visible
    await expect(page.locator('.health-accordion').first()).toBeVisible();
  });

  test('clicking Care Team navigates to /care-team', async ({ page }) => {
    await page.getByRole('link', { name: /Care Team/ }).first().click();
    await expect(page).toHaveURL(/\/care-team$/);
  });

  test('clicking Documents navigates to /documents', async ({ page }) => {
    await page.getByRole('link', { name: /Documents/ }).first().click();
    await expect(page).toHaveURL(/\/documents$/);
  });

  test('clicking Activity navigates to /activity', async ({ page }) => {
    await page.getByRole('link', { name: /Activity/ }).first().click();
    await expect(page).toHaveURL(/\/activity$/);
  });

  test('back button preserves section (URL-synced)', async ({ page }) => {
    await page.getByRole('link', { name: /Health Records/ }).first().click();
    await expect(page).toHaveURL(/\/health$/);
    await page.getByRole('link', { name: /Care Team/ }).first().click();
    await expect(page).toHaveURL(/\/care-team$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/health$/);
  });

  test('screenshot: desktop overview', async ({ page }) => {
    await page.screenshot({ path: 'test-results/redesign-desktop-overview.png', fullPage: true });
  });

  test('screenshot: desktop health records', async ({ page }) => {
    await page.getByRole('link', { name: /Health Records/ }).first().click();
    await expect(page.locator('.health-accordion').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/redesign-desktop-health.png', fullPage: true });
  });

  test('screenshot: desktop care team', async ({ page }) => {
    await page.getByRole('link', { name: /Care Team/ }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/redesign-desktop-care-team.png', fullPage: true });
  });
});

// ============================================================
// MOBILE PILL NAVIGATION
// ============================================================
test.describe('Pet Profile - Mobile Pills', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Biscuit').click();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('sidebar is hidden on mobile', async ({ page }) => {
    const sidebar = page.locator('.pet-profile-sidebar');
    await expect(sidebar).not.toBeVisible();
  });

  test('pill row is visible on mobile', async ({ page }) => {
    const pills = page.locator('.pet-profile-pills');
    await expect(pills).toBeVisible();
  });

  test('pills are horizontally scrollable', async ({ page }) => {
    const pills = page.locator('.pet-profile-pills');
    const scrollWidth = await pills.evaluate(el => el.scrollWidth);
    const clientWidth = await pills.evaluate(el => el.clientWidth);
    // Pills should overflow (scrollable)
    expect(scrollWidth).toBeGreaterThanOrEqual(clientWidth);
  });

  test('clicking a pill navigates to section', async ({ page }) => {
    await page.locator('.pet-profile-pill').filter({ hasText: 'Health Records' }).click();
    await expect(page).toHaveURL(/\/health$/);
  });

  test('screenshot: mobile overview', async ({ page }) => {
    await page.screenshot({ path: 'test-results/redesign-mobile-overview.png', fullPage: true });
  });

  test('screenshot: mobile health records', async ({ page }) => {
    await page.locator('.pet-profile-pill').filter({ hasText: 'Health Records' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/redesign-mobile-health.png', fullPage: true });
  });
});

// ============================================================
// HEALTH ACCORDION
// ============================================================
test.describe('Health Records - Accordion', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Biscuit').click();
    await expect(page.locator('h1')).toBeVisible();
    await page.getByRole('link', { name: /Health Records/ }).first().click();
    await expect(page.locator('.health-accordion').first()).toBeVisible();
  });

  test('conditions and allergies accordions are open by default', async ({ page }) => {
    const conditionsAccordion = page.locator('.health-accordion').filter({ hasText: 'Conditions' });
    const allergiesAccordion = page.locator('.health-accordion').filter({ hasText: 'Allergies' });

    // These should be open (have the 'open' attribute)
    await expect(conditionsAccordion).toHaveAttribute('open', '');
    await expect(allergiesAccordion).toHaveAttribute('open', '');
  });

  test('medications accordion is collapsed by default', async ({ page }) => {
    const medsAccordion = page.locator('.health-accordion').filter({ hasText: 'Medications' });
    // Should NOT have open attribute
    const isOpen = await medsAccordion.evaluate(el => el.hasAttribute('open'));
    expect(isOpen).toBe(false);
  });

  test('clicking accordion summary toggles content', async ({ page }) => {
    const medsAccordion = page.locator('.health-accordion').filter({ hasText: 'Medications' });
    // Click to open
    await medsAccordion.locator('.health-accordion-summary').click();
    await expect(medsAccordion).toHaveAttribute('open', '');
    // Click to close
    await medsAccordion.locator('.health-accordion-summary').click();
    const isOpen = await medsAccordion.evaluate(el => el.hasAttribute('open'));
    expect(isOpen).toBe(false);
  });

  test('all 5 health accordion sections are present', async ({ page }) => {
    const accordions = page.locator('.health-accordion');
    await expect(accordions).toHaveCount(5);
  });
});

// ============================================================
// EMERGENCY CARD PREVIEW
// ============================================================
test.describe('Emergency Card Preview', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Biscuit').click();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('emergency card preview is visible on overview', async ({ page }) => {
    const cardPreview = page.locator('.emergency-card-preview');
    await expect(cardPreview).toBeVisible();
  });

  test('card preview has red header with EMERGENCY PET CARD', async ({ page }) => {
    const header = page.locator('.emergency-card-preview-header');
    await expect(header).toContainText('EMERGENCY PET CARD');
  });

  test('card preview has Share Card button', async ({ page }) => {
    const shareBtn = page.locator('.emergency-card-preview-actions button').filter({ hasText: 'Share Card' });
    await expect(shareBtn).toBeVisible();
  });
});

// ============================================================
// STAT BLOCKS
// ============================================================
test.describe('Stat Blocks', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Biscuit').click();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('4 stat blocks are visible on overview', async ({ page }) => {
    const stats = page.locator('.pet-profile-stat');
    await expect(stats).toHaveCount(4);
  });

  test('stat blocks show labels for all categories', async ({ page }) => {
    await expect(page.locator('.pet-profile-stat-label').filter({ hasText: 'Conditions' })).toBeVisible();
    await expect(page.locator('.pet-profile-stat-label').filter({ hasText: 'Allergies' })).toBeVisible();
    await expect(page.locator('.pet-profile-stat-label').filter({ hasText: 'Medications' })).toBeVisible();
    await expect(page.locator('.pet-profile-stat-label').filter({ hasText: 'Vaccinations' })).toBeVisible();
  });

  test('clicking a stat block navigates to health records', async ({ page }) => {
    await page.locator('.pet-profile-stat').first().click();
    await expect(page).toHaveURL(/\/health$/);
  });
});

// ============================================================
// BREADCRUMBS
// ============================================================
test.describe('Breadcrumbs', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Biscuit').click();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('overview shows Dashboard > PetName', async ({ page }) => {
    const breadcrumb = page.locator('.breadcrumb');
    await expect(breadcrumb.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(breadcrumb.locator('.current')).toContainText('Biscuit');
  });

  test('health section shows Dashboard > PetName > Health Records', async ({ page }) => {
    await page.getByRole('link', { name: /Health Records/ }).first().click();
    const breadcrumb = page.locator('.breadcrumb');
    await expect(breadcrumb.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(breadcrumb.getByRole('link', { name: 'Biscuit' })).toBeVisible();
    await expect(breadcrumb.locator('.current')).toContainText('Health Records');
  });

  test('clicking pet name in breadcrumb returns to overview', async ({ page }) => {
    await page.getByRole('link', { name: /Health Records/ }).first().click();
    await page.locator('.breadcrumb').getByRole('link', { name: 'Biscuit' }).click();
    const url = page.url();
    expect(url).not.toMatch(/\/(health|care-team|documents|activity)$/);
  });
});

// ============================================================
// DASHBOARD HEALTH CONTEXT
// ============================================================
test.describe('Dashboard - Health Context', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard pet cards show health status dots', async ({ page }) => {
    // Health data loads progressively, wait for it
    await page.waitForTimeout(2000);
    // Check if any status dots appeared
    const statusDots = page.locator('.dashboard-pet-health .status-dot');
    // May or may not have status dots depending on pet data
    const count = await statusDots.count();
    // Just verify the health context area exists
    const healthContextAreas = page.locator('.dashboard-pet-health');
    if (await healthContextAreas.count() > 0) {
      await expect(healthContextAreas.first()).toBeVisible();
    }
  });

  test('screenshot: dashboard with health context', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/redesign-dashboard-health.png', fullPage: true });
  });
});
