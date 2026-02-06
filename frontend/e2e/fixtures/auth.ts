import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';

// Test user credentials from seed data
export const TEST_USER = {
  email: 'sarah.chen@example.com',
  password: 'FureverCare2024!',
  name: 'Sarah Chen',
};

// Generate unique email for registration tests
export function generateTestEmail(): string {
  return `test.user.${Date.now()}@example.com`;
}

// Extended test fixtures with page objects
export const test = base.extend<{
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
}>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  // Pre-authenticated page for tests that need logged-in state
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await page.waitForURL('/dashboard');
    await use(page);
  },
});

export { expect } from '@playwright/test';
