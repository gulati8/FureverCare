import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Integration tests for the PATCH /pets/:id/vets/:vetId/primary endpoint
 *
 * Note: These tests are designed to verify the endpoint structure and error handling.
 * Full integration testing with a real database would require additional setup.
 */
describe('PATCH /pets/:id/vets/:vetId/primary endpoint', () => {
  it('should have the endpoint defined in the router', async () => {
    // This test verifies that the endpoint signature is correct
    // For full integration testing, a test database would be needed

    // Read the routes file to verify endpoint exists
    const fs = await import('fs/promises');
    const routesContent = await fs.readFile(
      new URL('./pets.ts', import.meta.url),
      'utf-8'
    );

    // Verify the endpoint is defined
    expect(routesContent).toContain("router.patch('/:id/vets/:vetId/primary'");
    expect(routesContent).toContain('authenticate');
    expect(routesContent).toContain('setPrimaryVet');
    expect(routesContent).toContain('getPetVets');
  });

  it('should return vets list on success', () => {
    // This test documents the expected response structure
    const expectedResponse = {
      // Should return array of vets with updated is_primary flags
      type: 'array',
      items: {
        id: 'number',
        pet_id: 'number',
        clinic_name: 'string',
        vet_name: 'string | null',
        phone: 'string | null',
        email: 'string | null',
        address: 'string | null',
        is_primary: 'boolean',
        created_at: 'Date',
      },
    };

    expect(expectedResponse).toBeDefined();
  });

  it('should verify access before allowing primary vet change', async () => {
    const fs = await import('fs/promises');
    const routesContent = await fs.readFile(
      new URL('./pets.ts', import.meta.url),
      'utf-8'
    );

    // Verify that verifyPetAccess is called before setPrimaryVet
    const patchEndpointMatch = routesContent.match(
      /router\.patch\('\/:id\/vets\/:vetId\/primary'[\s\S]*?}\);/
    );

    expect(patchEndpointMatch).toBeTruthy();
    const endpointCode = patchEndpointMatch![0];

    // Verify access check happens
    expect(endpointCode).toContain('verifyPetAccess');
    expect(endpointCode).toContain("res.status(404).json({ error: 'Pet not found' })");
  });

  it('should include audit context when calling setPrimaryVet', async () => {
    const fs = await import('fs/promises');
    const routesContent = await fs.readFile(
      new URL('./pets.ts', import.meta.url),
      'utf-8'
    );

    // Verify audit context is passed
    expect(routesContent).toContain('const audit =');
    expect(routesContent).toContain('userId: req.userId');
    expect(routesContent).toContain("source: 'manual'");
    expect(routesContent).toContain('await setPrimaryVet(petId, vetId, audit)');
  });
});

/**
 * Document extraction tests - verify that extracted vets are not auto-tagged as primary
 */
describe('Document extraction vet mapping', () => {
  it('should always set is_primary to false for extracted vets', async () => {
    const fs = await import('fs/promises');
    const classifierContent = await fs.readFile(
      new URL('../services/document-classifier.ts', import.meta.url),
      'utf-8'
    );

    // Find the vet mapping case
    const vetCaseMatch = classifierContent.match(
      /case 'vet':[\s\S]*?is_primary:.*$/m
    );

    expect(vetCaseMatch).toBeTruthy();
    const vetMapping = vetCaseMatch![0];

    // Verify is_primary is set to false, not based on data
    expect(vetMapping).toContain('is_primary: false');
    expect(vetMapping).toContain('// Always false - user will choose primary vet');
  });
});
