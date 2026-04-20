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
    this.modal = page.locator('main > div').filter({ hasText: 'Add New Pet' }).last();
    this.nameInput = this.modal.getByRole('textbox').first();
    this.speciesSelect = this.modal.locator('select').nth(0);
    this.breedInput = this.modal.getByRole('textbox').nth(1);
    this.dobInput = this.modal.getByRole('textbox').nth(2);
    this.sexSelect = this.modal.locator('select').nth(1);
    this.isFixedCheckbox = this.modal.getByRole('checkbox', { name: 'Spayed / Neutered' });
    this.weightInput = this.modal.getByRole('spinbutton');
    this.weightUnitSelect = this.modal.locator('select').nth(2);
    this.microchipInput = this.modal.getByRole('textbox').nth(3);
    this.submitButton = this.modal.locator('form').getByRole('button', { name: 'Add Pet' });
    this.cancelButton = this.modal.getByRole('button', { name: 'Cancel' });
    this.closeButton = this.modal.locator('button').first();
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
