import { Page, Locator, expect } from '@playwright/test';

export class PetDetailPage {
  readonly page: Page;
  readonly petName: Locator;
  readonly editButton: Locator;
  readonly accessButton: Locator;
  readonly shareCardButton: Locator;
  readonly deleteButton: Locator;

  // Tabs
  readonly overviewTab: Locator;
  readonly timelineTab: Locator;
  readonly conditionsTab: Locator;
  readonly allergiesTab: Locator;
  readonly medicationsTab: Locator;
  readonly vaccinationsTab: Locator;
  readonly vetsTab: Locator;
  readonly contactsTab: Locator;
  readonly documentsTab: Locator;
  readonly historyTab: Locator;

  // Tab content area
  readonly tabContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.petName = page.locator('h1');
    this.editButton = page.getByRole('button', { name: 'Edit' });
    this.accessButton = page.getByRole('button', { name: 'Access' });
    this.shareCardButton = page.getByRole('button', { name: 'Share Card' });
    this.deleteButton = page.getByRole('button', { name: 'Delete' });

    // Tab navigation
    this.overviewTab = page.getByRole('button', { name: /^Overview/ });
    this.timelineTab = page.getByRole('button', { name: /^Timeline/ });
    this.conditionsTab = page.getByRole('button', { name: /^Conditions/ });
    this.allergiesTab = page.getByRole('button', { name: /^Allergies/ });
    this.medicationsTab = page.getByRole('button', { name: /^Medications/ });
    this.vaccinationsTab = page.getByRole('button', { name: /^Vaccinations/ });
    this.vetsTab = page.getByRole('button', { name: /^Veterinarians/ });
    this.contactsTab = page.getByRole('button', { name: /^Emergency Contacts/ });
    this.documentsTab = page.getByRole('button', { name: /^Import Documents/ });
    this.historyTab = page.getByRole('button', { name: /^History/ });

    this.tabContent = page.locator('.card').last();
  }

  async goto(petId: number) {
    await this.page.goto(`/pets/${petId}`);
  }

  async waitForLoad() {
    await expect(this.petName).toBeVisible();
  }

  async getPetName() {
    return this.petName.textContent();
  }

  // Tab navigation
  async goToConditionsTab() {
    await this.conditionsTab.click();
  }

  async goToAllergiesTab() {
    await this.allergiesTab.click();
  }

  async goToMedicationsTab() {
    await this.medicationsTab.click();
  }

  async goToVaccinationsTab() {
    await this.vaccinationsTab.click();
  }

  async goToVetsTab() {
    await this.vetsTab.click();
  }

  async goToContactsTab() {
    await this.contactsTab.click();
  }

  // Add Condition
  async addCondition(name: string, severity?: string, notes?: string) {
    await this.goToConditionsTab();
    await this.page.getByRole('button', { name: '+ Add Condition' }).click();
    await this.page.getByPlaceholder('Condition name *').fill(name);
    if (severity) {
      await this.page.locator('select').filter({ hasText: 'Severity' }).selectOption(severity);
    }
    if (notes) {
      await this.page.getByPlaceholder('Notes (optional)').fill(notes);
    }
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  // Add Allergy
  async addAllergy(allergen: string, severity?: string, reaction?: string) {
    await this.goToAllergiesTab();
    await this.page.getByRole('button', { name: '+ Add Allergy' }).click();
    await this.page.getByPlaceholder('Allergen *').fill(allergen);
    if (reaction) {
      await this.page.getByPlaceholder('Reaction (optional)').fill(reaction);
    }
    if (severity) {
      await this.page.locator('select').filter({ hasText: 'Severity' }).selectOption(severity);
    }
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  // Add Medication
  async addMedication(name: string, dosage?: string, frequency?: string) {
    await this.goToMedicationsTab();
    await this.page.getByRole('button', { name: '+ Add Medication' }).click();
    await this.page.getByPlaceholder('Medication name *').fill(name);
    if (dosage) {
      await this.page.getByPlaceholder('Dosage (e.g., 10mg)').fill(dosage);
    }
    if (frequency) {
      await this.page.getByPlaceholder('Frequency (e.g., twice daily)').fill(frequency);
    }
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  // Add Vaccination
  async addVaccination(name: string, adminDate: string, expDate?: string) {
    await this.goToVaccinationsTab();
    await this.page.getByRole('button', { name: '+ Add Vaccination' }).click();
    await this.page.getByPlaceholder('Vaccination name *').fill(name);
    await this.page.locator('input[type="date"]').first().fill(adminDate);
    if (expDate) {
      await this.page.locator('input[type="date"]').last().fill(expDate);
    }
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  // Add Vet
  async addVet(clinicName: string, vetName?: string, phone?: string) {
    await this.goToVetsTab();
    await this.page.getByRole('button', { name: '+ Add Vet' }).click();
    await this.page.getByPlaceholder('Clinic name *').fill(clinicName);
    if (vetName) {
      await this.page.getByPlaceholder('Vet name').fill(vetName);
    }
    if (phone) {
      await this.page.getByPlaceholder('Phone number').fill(phone);
    }
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  // Add Emergency Contact
  async addEmergencyContact(name: string, phone: string, relationship?: string) {
    await this.goToContactsTab();
    await this.page.getByRole('button', { name: '+ Add Contact' }).click();
    await this.page.getByPlaceholder('Name *').fill(name);
    await this.page.getByPlaceholder('Phone *').fill(phone);
    if (relationship) {
      await this.page.getByPlaceholder('Relationship').fill(relationship);
    }
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  // Delete health record item (generic)
  async deleteItem(itemName: string) {
    const row = this.page.locator('li').filter({ hasText: itemName });
    await row.getByRole('button', { name: 'Delete' }).click();
  }

  // Delete pet
  async deletePet() {
    this.page.on('dialog', dialog => dialog.accept());
    await this.deleteButton.click();
  }
}
