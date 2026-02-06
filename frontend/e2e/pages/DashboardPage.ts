import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly userGreeting: Locator;
  readonly logoutButton: Locator;
  readonly addPetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /my pets/i });
    this.userGreeting = page.locator('text=/Hi, .+/');
    this.logoutButton = page.getByRole('button', { name: /logout/i });
    this.addPetButton = page.getByRole('button', { name: /add pet/i });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async logout() {
    await this.logoutButton.click();
  }

  async isVisible(): Promise<boolean> {
    return this.heading.isVisible();
  }

  async getUserName(): Promise<string | null> {
    const text = await this.userGreeting.textContent();
    if (!text) return null;
    const match = text.match(/Hi, (.+)/);
    return match ? match[1] : null;
  }
}
