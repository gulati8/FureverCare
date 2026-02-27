import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPetVet, setPrimaryVet, PetVet } from './health-records.js';
import * as pool from '../db/pool.js';
import * as auditLogger from '../services/audit-logger.js';

// Mock dependencies
vi.mock('../db/pool.js');
vi.mock('../db/redis.js');
vi.mock('../services/audit-logger.js');

describe('Primary Vet Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPetVet', () => {
    it('should set is_primary to true when no existing vets exist for the pet', async () => {
      // Mock: No existing vets
      vi.spyOn(pool, 'query').mockResolvedValueOnce([]);

      // Mock: Insert returns the new vet
      const mockVet: PetVet = {
        id: 1,
        pet_id: 1,
        clinic_name: 'Happy Paws Clinic',
        vet_name: 'Dr. Smith',
        phone: '555-1234',
        email: 'smith@happypaws.com',
        address: '123 Main St',
        is_primary: true,
        created_at: new Date(),
      };

      vi.spyOn(pool, 'queryOne').mockResolvedValueOnce(mockVet);

      const result = await createPetVet(1, {
        clinic_name: 'Happy Paws Clinic',
        vet_name: 'Dr. Smith',
        phone: '555-1234',
        email: 'smith@happypaws.com',
        address: '123 Main St',
        is_primary: undefined, // Not explicitly set
      });

      expect(result.is_primary).toBe(true);
      // Verify the query checked for existing vets
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id FROM pet_vets WHERE pet_id = $1 LIMIT 1',
        [1]
      );
    });

    it('should set is_primary to false when existing vets already exist', async () => {
      // Mock: Existing vet found
      vi.spyOn(pool, 'query').mockResolvedValueOnce([{ id: 1 }]);

      // Mock: Insert returns the new vet
      const mockVet: PetVet = {
        id: 2,
        pet_id: 1,
        clinic_name: 'City Vet Clinic',
        vet_name: 'Dr. Jones',
        phone: '555-5678',
        email: 'jones@cityvet.com',
        address: '456 Oak Ave',
        is_primary: false,
        created_at: new Date(),
      };

      vi.spyOn(pool, 'queryOne').mockResolvedValueOnce(mockVet);

      const result = await createPetVet(1, {
        clinic_name: 'City Vet Clinic',
        vet_name: 'Dr. Jones',
        phone: '555-5678',
        email: 'jones@cityvet.com',
        address: '456 Oak Ave',
        is_primary: undefined, // Not explicitly set
      });

      expect(result.is_primary).toBe(false);
    });

    it('should respect explicitly set is_primary value regardless of existing vets', async () => {
      // Mock: Insert returns the new vet with explicit is_primary
      const mockVet: PetVet = {
        id: 1,
        pet_id: 1,
        clinic_name: 'Emergency Vet',
        vet_name: 'Dr. Emergency',
        phone: '555-0000',
        email: null,
        address: null,
        is_primary: true,
        created_at: new Date(),
      };

      vi.spyOn(pool, 'queryOne').mockResolvedValueOnce(mockVet);

      const result = await createPetVet(1, {
        clinic_name: 'Emergency Vet',
        vet_name: 'Dr. Emergency',
        phone: '555-0000',
        email: null,
        address: null,
        is_primary: true, // Explicitly set
      });

      expect(result.is_primary).toBe(true);
      // Should NOT check for existing vets when explicitly set
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('setPrimaryVet', () => {
    it('should set target vet as primary and unset all others', async () => {
      const petId = 1;
      const vetId = 2;

      // Mock transaction helper
      const mockClient = {
        query: vi.fn(),
      };

      // Mock existing vets
      const existingVets = [
        {
          id: 1,
          pet_id: 1,
          clinic_name: 'Vet A',
          vet_name: 'Dr. A',
          phone: '555-1111',
          email: 'a@vet.com',
          address: '111 St',
          is_primary: true, // Currently primary
          created_at: new Date(),
        },
        {
          id: 2,
          pet_id: 1,
          clinic_name: 'Vet B',
          vet_name: 'Dr. B',
          phone: '555-2222',
          email: 'b@vet.com',
          address: '222 St',
          is_primary: false,
          created_at: new Date(),
        },
      ];

      const updatedVet = { ...existingVets[1], is_primary: true };

      // Mock client.query calls in order
      mockClient.query
        .mockResolvedValueOnce({ rows: [existingVets[1]] }) // SELECT target vet
        .mockResolvedValueOnce({ rows: existingVets }) // SELECT all vets for audit
        .mockResolvedValueOnce({ rows: [] }) // UPDATE all to false
        .mockResolvedValueOnce({ rows: [updatedVet] }); // UPDATE target to true

      // Mock transaction
      vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockClient);
      });

      // Mock audit logger
      vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

      const result = await setPrimaryVet(petId, vetId, {
        userId: 123,
        source: 'manual',
      });

      expect(result.is_primary).toBe(true);
      expect(result.id).toBe(vetId);

      // Verify transaction operations
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM pet_vets WHERE id = $1 AND pet_id = $2',
        [vetId, petId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE pet_vets SET is_primary = false WHERE pet_id = $1',
        [petId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE pet_vets SET is_primary = true WHERE id = $1 AND pet_id = $2 RETURNING *',
        [vetId, petId]
      );

      // Verify audit logging for promoted vet
      expect(auditLogger.logUpdate).toHaveBeenCalledWith(
        'pet_vets',
        vetId,
        existingVets[1],
        updatedVet,
        123,
        expect.objectContaining({ source: 'manual' })
      );

      // Verify audit logging for demoted vet
      expect(auditLogger.logUpdate).toHaveBeenCalledWith(
        'pet_vets',
        1,
        existingVets[0],
        expect.objectContaining({ is_primary: false }),
        123,
        expect.objectContaining({ source: 'manual' })
      );
    });

    it('should throw error when vet not found', async () => {
      const petId = 1;
      const vetId = 999;

      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }), // No vet found
      };

      vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockClient);
      });

      await expect(setPrimaryVet(petId, vetId)).rejects.toThrow('Vet not found');
    });

    it('should handle single vet case without errors', async () => {
      const petId = 1;
      const vetId = 1;

      const mockClient = {
        query: vi.fn(),
      };

      const singleVet = {
        id: 1,
        pet_id: 1,
        clinic_name: 'Only Vet',
        vet_name: 'Dr. Only',
        phone: '555-0000',
        email: 'only@vet.com',
        address: '100 St',
        is_primary: false,
        created_at: new Date(),
      };

      const updatedVet = { ...singleVet, is_primary: true };

      mockClient.query
        .mockResolvedValueOnce({ rows: [singleVet] }) // SELECT target vet
        .mockResolvedValueOnce({ rows: [singleVet] }) // SELECT all vets
        .mockResolvedValueOnce({ rows: [] }) // UPDATE all to false
        .mockResolvedValueOnce({ rows: [updatedVet] }); // UPDATE target to true

      vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockClient);
      });

      vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

      const result = await setPrimaryVet(petId, vetId, { userId: 123 });

      expect(result.is_primary).toBe(true);
      // Should only log update for the promoted vet, not demotion (no previously primary vet)
      expect(auditLogger.logUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
