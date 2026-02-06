import { Page, Locator, expect } from '@playwright/test';

export class AddPetModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly nameInput: Locator;
  readonly speciesSelect: Locator;
  readonly breedInput: Locator;
  readonly dobInput: Locator;
  readonly sexSelect: Locator;
  readonly isFixedCheckbox: Locator;
  readonly weightInput: Locator;
  readonly weightUnitSelect: Locator;
  readonly microchipInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('.fixed.inset-0').filter({ hasText: 'Add New Pet' });
    this.nameInput = this.modal.getByLabel('Pet Name *');
    this.speciesSelect = this.modal.getByLabel('Species *');
    this.breedInput = this.modal.getByLabel('Breed');
    this.dobInput = this.modal.getByLabel('Date of Birth');
    this.sexSelect = this.modal.getByLabel('Sex');
    this.isFixedCheckbox = this.modal.getByLabel('Spayed / Neutered');
    this.weightInput = this.modal.getByLabel('Weight');
    this.weightUnitSelect = this.modal.getByLabel('Weight Unit');
    this.microchipInput = this.modal.getByLabel('Microchip ID');
    this.submitButton = this.modal.getByRole('button', { name: 'Add Pet' });
    this.cancelButton = this.modal.getByRole('button', { name: 'Cancel' });
    this.closeButton = this.modal.locator('button').filter({ has: this.page.locator('svg') }).first();
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async waitForModal() {
    await expect(this.modal).toBeVisible();
  }

  async fillPetDetails(details: {
    name: string;
    species?: string;
    breed?: string;
    dateOfBirth?: string;
    sex?: string;
    isFixed?: boolean;
    weight?: number;
    weightUnit?: 'lbs' | 'kg';
    microchipId?: string;
  }) {
    await this.nameInput.fill(details.name);

    if (details.species) {
      await this.speciesSelect.selectOption(details.species);
    }

    if (details.breed) {
      await this.breedInput.fill(details.breed);
    }

    if (details.dateOfBirth) {
      await this.dobInput.fill(details.dateOfBirth);
    }

    if (details.sex) {
      await this.sexSelect.selectOption(details.sex);
    }

    if (details.isFixed) {
      await this.isFixedCheckbox.check();
    }

    if (details.weight !== undefined) {
      await this.weightInput.fill(details.weight.toString());
    }

    if (details.weightUnit) {
      await this.weightUnitSelect.selectOption(details.weightUnit);
    }

    if (details.microchipId) {
      await this.microchipInput.fill(details.microchipId);
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async close() {
    await this.closeButton.click();
  }
}
