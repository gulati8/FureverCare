import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email address');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign in/i }).first();
    this.errorMessage = page.locator('.bg-red-50');
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot your password/i });
    this.registerLink = page.getByRole('button', { name: /sign up/i });
  }

  async goto() {
    await this.page.goto('/login');
    // Wait for the login modal to appear
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorText(): Promise<string | null> {
    return this.errorMessage.textContent();
  }
}
