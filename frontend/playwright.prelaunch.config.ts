/**
 * Playwright config for pre-launch regression suite.
 * Uses a setup project to login once and reuse auth state across all tests.
 * This avoids rate-limit issues on UAT from parallel login attempts.
 */
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseURL = process.env.UAT_URL || 'http://localhost:5173';
export const AUTH_FILE = join(__dirname, '.auth', 'prelaunch-user.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // Single worker to avoid session conflicts and rate-limiting on UAT
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  outputDir: '../tmp/test-results-prelaunch',
  projects: [
    // Setup project: logs in once, saves auth state
    {
      name: 'setup',
      testMatch: /prelaunch-auth-setup\.ts/,
    },
    // All pre-launch spec files use the saved auth state
    // dependencies: ['setup'] is commented out since auth file is already saved
    // Re-enable 'dependencies' if the auth file needs to be regenerated
    {
      name: 'prelaunch',
      use: {
        ...devices['Desktop Chrome'],
        storageState: join(__dirname, '.auth', 'prelaunch-user.json'),
      },
      testMatch: /prelaunch-pg[1-7]-.*\.spec\.ts/,
      // dependencies: ['setup'],
    },
  ],
  ...(!process.env.UAT_URL && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  }),
});
