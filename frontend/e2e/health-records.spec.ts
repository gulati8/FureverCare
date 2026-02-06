import { test, expect } from '@playwright/test';
import { PetDetailPage } from './pages/PetDetailPage';

const TEST_USER = {
  email: 'sarah.chen@example.com',
  password: 'FureverCare2024!',
};

test.describe('Health Records', () => {
  let petDetailPage: PetDetailPage;

  test.beforeEach(async ({ page }) => {
    petDetailPage = new PetDetailPage(page);

    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email address').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Navigate to Biscuit's detail page
    await page.getByText('Biscuit').click();
    await petDetailPage.waitForLoad();
  });

  test.describe('Medical Conditions', () => {
    test('should add a medical condition', async ({ page }) => {
      const conditionName = `TestCondition_${Date.now()}`;

      await petDetailPage.addCondition(conditionName, 'moderate', 'Test notes');

      // Verify condition appears in list
      await expect(page.getByText(conditionName)).toBeVisible();
      await expect(page.getByText('moderate')).toBeVisible();
    });

    test('should delete a medical condition', async ({ page }) => {
      // First add a condition to delete
      const conditionName = `DeleteCondition_${Date.now()}`;
      await petDetailPage.addCondition(conditionName);
      await expect(page.getByText(conditionName)).toBeVisible();

      // Delete it
      await petDetailPage.deleteItem(conditionName);

      // Verify it's gone
      await expect(page.getByText(conditionName)).not.toBeVisible();
    });
  });

  test.describe('Allergies', () => {
    test('should add an allergy with severity', async ({ page }) => {
      const allergen = `TestAllergen_${Date.now()}`;

      await petDetailPage.addAllergy(allergen, 'severe', 'Hives and swelling');

      // Verify allergy appears
      await expect(page.getByText(allergen)).toBeVisible();
      await expect(page.getByText('severe')).toBeVisible();
    });

    test('should add a life-threatening allergy', async ({ page }) => {
      const allergen = `LifeThreateningAllergy_${Date.now()}`;

      await petDetailPage.addAllergy(allergen, 'life-threatening', 'Anaphylaxis');

      // Verify allergy appears with life-threatening severity
      await expect(page.getByText(allergen)).toBeVisible();
      await expect(page.getByText('life-threatening')).toBeVisible();
    });

    test('should delete an allergy', async ({ page }) => {
      const allergen = `DeleteAllergy_${Date.now()}`;
      await petDetailPage.addAllergy(allergen);
      await expect(page.getByText(allergen)).toBeVisible();

      await petDetailPage.deleteItem(allergen);
      await expect(page.getByText(allergen)).not.toBeVisible();
    });
  });

  test.describe('Medications', () => {
    test('should add a medication with dosage and frequency', async ({ page }) => {
      const medName = `TestMed_${Date.now()}`;

      await petDetailPage.addMedication(medName, '10mg', 'twice daily');

      // Verify medication appears
      await expect(page.getByText(medName)).toBeVisible();
      await expect(page.getByText('10mg')).toBeVisible();
      await expect(page.getByText('twice daily')).toBeVisible();
    });

    test('should delete a medication', async ({ page }) => {
      const medName = `DeleteMed_${Date.now()}`;
      await petDetailPage.addMedication(medName);
      await expect(page.getByText(medName)).toBeVisible();

      await petDetailPage.deleteItem(medName);
      await expect(page.getByText(medName)).not.toBeVisible();
    });

    test('should discontinue and reactivate a medication', async ({ page }) => {
      const medName = `DiscontinueMed_${Date.now()}`;
      await petDetailPage.addMedication(medName, '5mg', 'once daily');
      await expect(page.getByText(medName)).toBeVisible();

      // Discontinue the medication
      const medRow = page.locator('li').filter({ hasText: medName });
      await medRow.getByRole('button', { name: 'Discontinue' }).click();

      // Verify it moved to past medications (has strikethrough class)
      await expect(page.locator('.line-through').filter({ hasText: medName })).toBeVisible();

      // Reactivate
      await medRow.getByRole('button', { name: 'Reactivate' }).click();

      // Verify it's back to active (no strikethrough)
      await expect(page.locator('.line-through').filter({ hasText: medName })).not.toBeVisible();
      await expect(page.getByText(medName)).toBeVisible();
    });
  });

  test.describe('Vaccinations', () => {
    test('should add a vaccination', async ({ page }) => {
      const vacName = `TestVaccine_${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await petDetailPage.addVaccination(vacName, today, nextYear);

      // Verify vaccination appears
      await expect(page.getByText(vacName)).toBeVisible();
    });

    test('should delete a vaccination', async ({ page }) => {
      const vacName = `DeleteVaccine_${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];

      await petDetailPage.addVaccination(vacName, today);
      await expect(page.getByText(vacName)).toBeVisible();

      await petDetailPage.deleteItem(vacName);
      await expect(page.getByText(vacName)).not.toBeVisible();
    });
  });

  test.describe('Veterinarians', () => {
    test('should add a veterinarian', async ({ page }) => {
      const clinicName = `TestClinic_${Date.now()}`;

      await petDetailPage.addVet(clinicName, 'Smith', '555-0123');

      // Verify vet appears
      await expect(page.getByText(clinicName)).toBeVisible();
      await expect(page.getByText('Dr. Smith')).toBeVisible();
      await expect(page.getByText('555-0123')).toBeVisible();
    });

    test('should delete a veterinarian', async ({ page }) => {
      const clinicName = `DeleteClinic_${Date.now()}`;
      await petDetailPage.addVet(clinicName);
      await expect(page.getByText(clinicName)).toBeVisible();

      await petDetailPage.deleteItem(clinicName);
      await expect(page.getByText(clinicName)).not.toBeVisible();
    });
  });

  test.describe('Emergency Contacts', () => {
    test('should add an emergency contact', async ({ page }) => {
      const contactName = `TestContact_${Date.now()}`;

      await petDetailPage.addEmergencyContact(contactName, '555-9999', 'Neighbor');

      // Verify contact appears
      await expect(page.getByText(contactName)).toBeVisible();
      await expect(page.getByText('555-9999')).toBeVisible();
      await expect(page.getByText('Neighbor')).toBeVisible();
    });

    test('should delete an emergency contact', async ({ page }) => {
      const contactName = `DeleteContact_${Date.now()}`;
      await petDetailPage.addEmergencyContact(contactName, '555-0000');
      await expect(page.getByText(contactName)).toBeVisible();

      await petDetailPage.deleteItem(contactName);
      await expect(page.getByText(contactName)).not.toBeVisible();
    });
  });
});
