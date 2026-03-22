import { Page, Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel('Your name');
    this.emailInput = page.getByLabel('Email address');
    this.phoneInput = page.getByLabel('Phone number (optional)');
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirm password');
    this.submitButton = page.getByRole('button', { name: /create account/i });
    this.errorMessage = page.locator('.bg-red-50');
    this.loginLink = page.getByRole('button', { name: /sign in/i });
  }

  async goto() {
    await this.page.goto('/register');
    // Wait for the register modal to appear
    await this.nameInput.waitFor({ state: 'visible' });
  }

  async register(name: string, email: string, password: string, phone?: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    if (phone) {
      await this.phoneInput.fill(phone);
    }
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorText(): Promise<string | null> {
    return this.errorMessage.textContent();
  }
}
