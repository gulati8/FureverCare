import { test, expect, TEST_USER, generateTestEmail } from './fixtures/auth';

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ registerPage, page }) => {
      const uniqueEmail = generateTestEmail();

      await registerPage.goto();
      await registerPage.register('Test User', uniqueEmail, 'TestPassword123!');

      // Should redirect to dashboard after successful registration
      await expect(page).toHaveURL('/dashboard');
    });

    test('should show error for mismatched passwords', async ({ registerPage }) => {
      await registerPage.goto();

      await registerPage.nameInput.fill('Test User');
      await registerPage.emailInput.fill('test@example.com');
      await registerPage.passwordInput.fill('Password123!');
      await registerPage.confirmPasswordInput.fill('DifferentPassword!');
      await registerPage.submitButton.click();

      await expect(registerPage.errorMessage).toBeVisible();
      await expect(registerPage.errorMessage).toContainText('Passwords do not match');
    });

    test('should show error for short password', async ({ registerPage }) => {
      await registerPage.goto();

      await registerPage.nameInput.fill('Test User');
      await registerPage.emailInput.fill('test@example.com');
      await registerPage.passwordInput.fill('short');
      await registerPage.confirmPasswordInput.fill('short');
      await registerPage.submitButton.click();

      await expect(registerPage.errorMessage).toBeVisible();
      await expect(registerPage.errorMessage).toContainText('at least 8 characters');
    });
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, TEST_USER.password);

      // Should redirect to dashboard after successful login
      await expect(page).toHaveURL('/dashboard');

      // Should show the dashboard heading
      await expect(page.getByRole('heading', { name: /my pets/i })).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, 'wrongpassword');

      // Should show error message
      await expect(loginPage.errorMessage).toBeVisible();
    });

    test('should have link to forgot password', async ({ loginPage }) => {
      await loginPage.goto();

      await expect(loginPage.forgotPasswordLink).toBeVisible();
      await loginPage.forgotPasswordLink.click();

      await expect(loginPage.page).toHaveURL('/forgot-password');
    });

    test('should have link to register page', async ({ loginPage }) => {
      await loginPage.goto();

      await expect(loginPage.registerLink).toBeVisible();
      await loginPage.registerLink.click();

      // Register is a modal that opens on the landing page
      await expect(loginPage.page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ authenticatedPage }) => {
      const dashboardPage = await import('./pages/DashboardPage').then(
        m => new m.DashboardPage(authenticatedPage)
      );

      // Verify we're on dashboard
      await expect(dashboardPage.heading).toBeVisible();

      // Click logout
      await dashboardPage.logout();

      // Should redirect to landing page (no longer a dedicated /login page)
      await expect(authenticatedPage).toHaveURL('/');
    });
  });

  test.describe('Password Reset', () => {
    test('should submit password reset request', async ({ page }) => {
      await page.goto('/forgot-password');

      // Fill in email
      await page.getByLabel('Email address').fill(TEST_USER.email);

      // Click submit
      await page.getByRole('button', { name: /send reset link/i }).click();

      // Should show success message
      await expect(page.getByText(/check your email/i)).toBeVisible();
      await expect(page.getByText(TEST_USER.email)).toBeVisible();
    });

    test('should allow trying different email', async ({ page }) => {
      await page.goto('/forgot-password');

      // Submit first request
      await page.getByLabel('Email address').fill(TEST_USER.email);
      await page.getByRole('button', { name: /send reset link/i }).click();

      // Wait for success state
      await expect(page.getByText(/check your email/i)).toBeVisible();

      // Click try different email
      await page.getByRole('button', { name: /try a different email/i }).click();

      // Should show form again
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Email address')).toHaveValue('');
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page refresh', async ({ loginPage, page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await expect(page).toHaveURL('/dashboard');

      // Refresh the page
      await page.reload();

      // Should still be on dashboard (not redirected to login)
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByRole('heading', { name: /my pets/i })).toBeVisible();
    });

    test('should redirect to login when not authenticated', async ({ page }) => {
      // Clear any existing auth state
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to landing page (login modal may appear)
      await expect(page).not.toHaveURL('/dashboard');
    });

    test('should redirect authenticated user from login to dashboard', async ({ authenticatedPage }) => {
      // Try to access login page while authenticated
      await authenticatedPage.goto('/login');

      // Should redirect to dashboard
      await expect(authenticatedPage).toHaveURL('/dashboard');
    });
  });
});
