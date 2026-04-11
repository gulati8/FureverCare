/**
 * Email Templates auth setup.
 * Run this BEFORE email-templates.spec.ts.
 * Logs in once as admin and once as sarah.chen, saves both storage states.
 * All email-templates tests reuse these states — avoids login rate limiting on UAT.
 *
 * Usage (run both together):
 *   UAT_URL=... npx playwright test e2e/email-templates-auth-setup.spec.ts e2e/email-templates.spec.ts --reporter=list
 */
import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const EMAIL_TEMPLATES_AUTH_FILE = join(__dirname, '..', '.auth', 'email-templates-admin.json');
export const EMAIL_TEMPLATES_SARAH_AUTH_FILE = join(__dirname, '..', '.auth', 'email-templates-sarah.json');

setup('create admin auth state for email-templates tests', async ({ page }) => {
  mkdirSync(join(__dirname, '..', '.auth'), { recursive: true });

  await page.goto('/login');
  await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 20000 });

  // Use the seeded admin account
  await page.getByLabel('Email address').fill('admin@furevercare.com');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Admin users redirect to /admin/analytics, non-admins go to /dashboard
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30000 });

  await page.context().storageState({ path: EMAIL_TEMPLATES_AUTH_FILE });
});

setup('create sarah.chen auth state for invitation tests', async ({ page }) => {
  mkdirSync(join(__dirname, '..', '.auth'), { recursive: true });

  await page.goto('/login');
  await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 20000 });

  await page.getByLabel('Email address').fill('sarah.chen@example.com');
  await page.getByLabel('Password').fill('FureverCare2024!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30000 });

  await page.context().storageState({ path: EMAIL_TEMPLATES_SARAH_AUTH_FILE });
});
