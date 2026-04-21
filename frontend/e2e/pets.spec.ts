import { test, expect } from '@playwright/test';
import { AddPetModal } from './pages/AddPetModal';
import { PetDetailPage } from './pages/PetDetailPage';

const TEST_USER = {
  email: 'sarah.chen@example.com',
  password: 'FureverCare2024!',
};

test.describe('Pet Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email address').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display dashboard with pet list', async ({ page }) => {
    // Verify dashboard loads
    await expect(page.getByRole('heading', { name: 'My Pets' })).toBeVisible();

    // Verify Add Pet button exists
    await expect(page.getByRole('button', { name: 'Add Pet' })).toBeVisible();

    // Verify seed pet "Biscuit" appears
    await expect(page.getByText('Biscuit')).toBeVisible();
  });

  test('should create a new pet', async ({ page }) => {
    const addPetModal = new AddPetModal(page);

    // Open Add Pet modal
    await page.getByRole('button', { name: 'Add Pet' }).click();
    await addPetModal.waitForModal();

    // Fill in pet details
    const uniqueName = `TestPet_${Date.now()}`;
    await addPetModal.fillPetDetails({
      name: uniqueName,
      species: 'cat',
      breed: 'Siamese',
      sex: 'female',
      isFixed: true,
      weight: 8.5,
      weightUnit: 'lbs',
    });

    // Submit the form
    await addPetModal.submit();

    // Wait for modal to close and verify pet appears on dashboard
    await expect(addPetModal.modal).not.toBeVisible();
    await expect(page.getByText(uniqueName)).toBeVisible();

    await page.reload();
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test('should view pet detail page', async ({ page }) => {
    const petDetailPage = new PetDetailPage(page);

    // Click on Biscuit to go to detail page
    await page.getByText('Biscuit').click();

    // Verify we're on the pet detail page
    await petDetailPage.waitForLoad();
    expect(await petDetailPage.getPetName()).toContain('Biscuit');

    // Verify key elements are present
    await expect(petDetailPage.accessButton).toBeVisible();
    await expect(petDetailPage.shareCardButton).toBeVisible();

    // Verify profile navigation is present
    await expect(petDetailPage.overviewNav.first()).toBeVisible();
    await expect(petDetailPage.healthRecordsNav.first()).toBeVisible();
    await expect(petDetailPage.careTeamNav.first()).toBeVisible();
    await expect(petDetailPage.activityNav.first()).toBeVisible();
  });

  test('should edit pet details', async ({ page }) => {
    const petDetailPage = new PetDetailPage(page);

    // Navigate to pet detail
    await page.getByText('Biscuit').click();
    await petDetailPage.waitForLoad();

    // Edit the inline microchip field on the overview tab.
    await page.locator('dt').filter({ hasText: 'Microchip ID' }).locator('..').click();

    const microchipInput = page.getByPlaceholder('Microchip ID');
    await expect(microchipInput).toBeVisible();
    await microchipInput.clear();
    const newMicrochipId = `CHIP${Date.now()}`;
    await microchipInput.fill(newMicrochipId);

    await page.getByRole('button', { name: 'Save' }).click();

    // Verify change persists (microchip shown on overview)
    await expect(page.getByText(newMicrochipId, { exact: true }).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText(newMicrochipId, { exact: true }).first()).toBeVisible();
  });

  test('should open the send card modal from pet detail', async ({ page }) => {
    const petDetailPage = new PetDetailPage(page);

    await page.getByText('Biscuit').click();
    await petDetailPage.waitForLoad();

    await petDetailPage.shareCardButton.click();

    await expect(page.getByRole('heading', { name: /Share Biscuit's Card/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create time-limited or PIN-protected link/ })).toBeVisible();
  });

  test('should cancel add pet modal', async ({ page }) => {
    const addPetModal = new AddPetModal(page);

    // Open Add Pet modal
    await page.getByRole('button', { name: 'Add Pet' }).click();
    await addPetModal.waitForModal();

    // Fill partial data
    await addPetModal.nameInput.fill('CancelledPet');

    // Cancel
    await addPetModal.cancel();

    // Verify modal closes
    await expect(addPetModal.modal).not.toBeVisible();

    // Verify pet was not created
    await expect(page.getByText('CancelledPet')).not.toBeVisible();
  });
});
