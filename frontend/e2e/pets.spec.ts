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
    await expect(page.getByRole('button', { name: '+ Add Pet' })).toBeVisible();

    // Verify seed pet "Biscuit" appears
    await expect(page.getByText('Biscuit')).toBeVisible();
  });

  test('should create a new pet', async ({ page }) => {
    const addPetModal = new AddPetModal(page);

    // Open Add Pet modal
    await page.getByRole('button', { name: '+ Add Pet' }).click();
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
  });

  test('should view pet detail page', async ({ page }) => {
    const petDetailPage = new PetDetailPage(page);

    // Click on Biscuit to go to detail page
    await page.getByText('Biscuit').click();

    // Verify we're on the pet detail page
    await petDetailPage.waitForLoad();
    expect(await petDetailPage.getPetName()).toContain('Biscuit');

    // Verify key elements are present
    await expect(petDetailPage.editButton).toBeVisible();
    await expect(petDetailPage.shareCardButton).toBeVisible();
    await expect(petDetailPage.deleteButton).toBeVisible();

    // Verify tabs are present
    await expect(petDetailPage.overviewTab).toBeVisible();
    await expect(petDetailPage.conditionsTab).toBeVisible();
    await expect(petDetailPage.allergiesTab).toBeVisible();
    await expect(petDetailPage.medicationsTab).toBeVisible();
  });

  test('should edit pet details', async ({ page }) => {
    // Navigate to pet detail
    await page.getByText('Biscuit').click();
    await expect(page.getByRole('heading', { name: 'Biscuit' })).toBeVisible();

    // Click Edit button
    await page.getByRole('button', { name: 'Edit' }).click();

    // Verify edit modal opens
    await expect(page.getByText('Edit Pet')).toBeVisible();

    // Update a field (microchip ID)
    const microchipInput = page.getByLabel('Microchip ID');
    await microchipInput.clear();
    const newMicrochipId = `CHIP${Date.now()}`;
    await microchipInput.fill(newMicrochipId);

    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify modal closes
    await expect(page.getByText('Edit Pet')).not.toBeVisible();

    // Verify change persists (microchip shown on overview)
    await expect(page.getByText(newMicrochipId)).toBeVisible();
  });

  test('should delete a pet with confirmation', async ({ page }) => {
    const addPetModal = new AddPetModal(page);

    // First, create a pet to delete
    await page.getByRole('button', { name: '+ Add Pet' }).click();
    await addPetModal.waitForModal();

    const deletablePetName = `DeleteMe_${Date.now()}`;
    await addPetModal.fillPetDetails({
      name: deletablePetName,
      species: 'hamster',
    });
    await addPetModal.submit();
    await expect(addPetModal.modal).not.toBeVisible();
    await expect(page.getByText(deletablePetName)).toBeVisible();

    // Navigate to the pet's detail page
    await page.getByText(deletablePetName).click();
    await expect(page.getByRole('heading', { name: deletablePetName })).toBeVisible();

    // Set up dialog handler for confirmation
    page.on('dialog', dialog => dialog.accept());

    // Click delete
    await page.getByRole('button', { name: 'Delete' }).click();

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify pet no longer appears
    await expect(page.getByText(deletablePetName)).not.toBeVisible();
  });

  test('should cancel add pet modal', async ({ page }) => {
    const addPetModal = new AddPetModal(page);

    // Open Add Pet modal
    await page.getByRole('button', { name: '+ Add Pet' }).click();
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
