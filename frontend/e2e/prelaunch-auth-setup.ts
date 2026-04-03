/**
 * Pre-launch auth setup test.
 * Runs once as a setup project dependency — logs in and saves storage state.
 * All pre-launch tests reuse this auth state instead of logging in individually,
 * which prevents rate-limiting on UAT.
 */
import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUTH_FILE = join(__dirname, '..', '.auth', 'prelaunch-user.json');

setup('authenticate as sarah.chen', async ({ page }) => {
  await page.goto('/login');

  // Wait for login modal / form to be ready
  await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 15000 });

  await page.getByLabel('Email address').fill('sarah.chen@example.com');
  await page.getByLabel('Password').fill('FureverCare2024!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: /my pets/i })).toBeVisible();

  // Save auth state for all other tests
  await page.context().storageState({ path: AUTH_FILE });
});
