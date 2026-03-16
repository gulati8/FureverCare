import { Page, Locator, expect } from '@playwright/test';

export class PetDetailPage {
  readonly page: Page;
  readonly petName: Locator;
  readonly accessButton: Locator;
  readonly shareCardButton: Locator;
  readonly deleteButton: Locator;

  // Sidebar nav items (desktop) or pills (mobile)
  readonly overviewNav: Locator;
  readonly healthRecordsNav: Locator;
  readonly careTeamNav: Locator;
  readonly documentsNav: Locator;
  readonly activityNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.petName = page.locator('h1');
    this.accessButton = page.getByRole('button', { name: 'Access' });
    this.shareCardButton = page.getByRole('button', { name: 'Share Card' });
    this.deleteButton = page.getByRole('button', { name: 'Delete' });

    // Nav items work for both sidebar links and mobile pills
    this.overviewNav = page.getByRole('link', { name: /^Overview/ });
    this.healthRecordsNav = page.getByRole('link', { name: /^Health Records/ });
    this.careTeamNav = page.getByRole('link', { name: /^Care Team/ });
    this.documentsNav = page.getByRole('link', { name: /^Documents/ });
    this.activityNav = page.getByRole('link', { name: /^Activity/ });
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

  // Section navigation
  async goToHealthRecords() {
    await this.healthRecordsNav.first().click();
    // Wait for health accordion to appear
    await expect(this.page.locator('.health-accordion').first()).toBeVisible();
  }

  async goToCareTeam() {
    await this.careTeamNav.first().click();
  }

  async goToDocuments() {
    await this.documentsNav.first().click();
  }

  async goToActivity() {
    await this.activityNav.first().click();
  }

  // Open a specific health accordion by name
  private async openAccordion(name: string) {
    const accordion = this.page.locator('.health-accordion').filter({ hasText: name });
    // Click summary to open if not already open
    const isOpen = await accordion.evaluate(el => el.hasAttribute('open'));
    if (!isOpen) {
      await accordion.locator('.health-accordion-summary').click();
    }
  }

  // Tab navigation (now navigates to health section + opens accordion)
  async goToConditionsTab() {
    await this.goToHealthRecords();
    await this.openAccordion('Conditions');
  }

  async goToAllergiesTab() {
    await this.goToHealthRecords();
    await this.openAccordion('Allergies');
  }

  async goToMedicationsTab() {
    await this.goToHealthRecords();
    await this.openAccordion('Medications');
  }

  async goToVaccinationsTab() {
    await this.goToHealthRecords();
    await this.openAccordion('Vaccinations');
  }

  async goToVetsTab() {
    await this.goToCareTeam();
  }

  async goToContactsTab() {
    await this.goToCareTeam();
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
