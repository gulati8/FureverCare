import { query } from '../db/pool.js';
import { AuditLog } from '../services/audit-logger.js';

export interface AuditLogWithUser extends AuditLog {
  changed_by_name: string | null;
  changed_by_email: string | null;
}

/**
 * Get audit log entries for a pet and all its related entities
 */
export async function getAuditLogForPet(
  petId: number,
  options?: {
    limit?: number;
    offset?: number;
    entityType?: string;
    action?: string;
  }
): Promise<AuditLogWithUser[]> {
  let sql = `
    SELECT
      al.*,
      u.name as changed_by_name,
      u.email as changed_by_email
    FROM audit_log al
    LEFT JOIN users u ON al.changed_by = u.id
    WHERE (
      (al.entity_type = 'pets' AND al.entity_id = $1)
      OR (al.entity_type = 'pet_vaccinations' AND al.entity_id IN (SELECT id FROM pet_vaccinations WHERE pet_id = $1))
      OR (al.entity_type = 'pet_medications' AND al.entity_id IN (SELECT id FROM pet_medications WHERE pet_id = $1))
      OR (al.entity_type = 'pet_conditions' AND al.entity_id IN (SELECT id FROM pet_conditions WHERE pet_id = $1))
      OR (al.entity_type = 'pet_allergies' AND al.entity_id IN (SELECT id FROM pet_allergies WHERE pet_id = $1))
      OR (al.entity_type = 'pet_vets' AND al.entity_id IN (SELECT id FROM pet_vets WHERE pet_id = $1))
      OR (al.entity_type = 'pet_emergency_contacts' AND al.entity_id IN (SELECT id FROM pet_emergency_contacts WHERE pet_id = $1))
    )
  `;

  const params: any[] = [petId];
  let paramIndex = 2;

  if (options?.entityType) {
    sql += ` AND al.entity_type = $${paramIndex}`;
    params.push(options.entityType);
    paramIndex++;
  }

  if (options?.action) {
    sql += ` AND al.action = $${paramIndex}`;
    params.push(options.action);
    paramIndex++;
  }

  sql += ` ORDER BY al.created_at DESC`;

  if (options?.limit) {
    sql += ` LIMIT $${paramIndex}`;
    params.push(options.limit);
    paramIndex++;
  }

  if (options?.offset) {
    sql += ` OFFSET $${paramIndex}`;
    params.push(options.offset);
    paramIndex++;
  }

  return query<AuditLogWithUser>(sql, params);
}

/**
 * Get audit log entries for a specific record
 */
export async function getAuditLogForRecord(
  entityType: string,
  entityId: number
): Promise<AuditLogWithUser[]> {
  return query<AuditLogWithUser>(
    `SELECT
      al.*,
      u.name as changed_by_name,
      u.email as changed_by_email
    FROM audit_log al
    LEFT JOIN users u ON al.changed_by = u.id
    WHERE al.entity_type = $1 AND al.entity_id = $2
    ORDER BY al.created_at DESC`,
    [entityType, entityId]
  );
}

/**
 * Get count of audit log entries for a pet
 */
export async function getAuditLogCountForPet(
  petId: number,
  options?: {
    entityType?: string;
    action?: string;
  }
): Promise<number> {
  let sql = `
    SELECT COUNT(*) as count
    FROM audit_log al
    WHERE (
      (al.entity_type = 'pets' AND al.entity_id = $1)
      OR (al.entity_type = 'pet_vaccinations' AND al.entity_id IN (SELECT id FROM pet_vaccinations WHERE pet_id = $1))
      OR (al.entity_type = 'pet_medications' AND al.entity_id IN (SELECT id FROM pet_medications WHERE pet_id = $1))
      OR (al.entity_type = 'pet_conditions' AND al.entity_id IN (SELECT id FROM pet_conditions WHERE pet_id = $1))
      OR (al.entity_type = 'pet_allergies' AND al.entity_id IN (SELECT id FROM pet_allergies WHERE pet_id = $1))
      OR (al.entity_type = 'pet_vets' AND al.entity_id IN (SELECT id FROM pet_vets WHERE pet_id = $1))
      OR (al.entity_type = 'pet_emergency_contacts' AND al.entity_id IN (SELECT id FROM pet_emergency_contacts WHERE pet_id = $1))
    )
  `;

  const params: any[] = [petId];
  let paramIndex = 2;

  if (options?.entityType) {
    sql += ` AND al.entity_type = $${paramIndex}`;
    params.push(options.entityType);
    paramIndex++;
  }

  if (options?.action) {
    sql += ` AND al.action = $${paramIndex}`;
    params.push(options.action);
    paramIndex++;
  }

  const result = await query<{ count: string }>(sql, params);
  return parseInt(result[0]?.count || '0', 10);
}

/**
 * Get audit entries linked to a specific PDF upload
 */
export async function getAuditLogForPdfUpload(
  pdfUploadId: number
): Promise<AuditLogWithUser[]> {
  return query<AuditLogWithUser>(
    `SELECT
      al.*,
      u.name as changed_by_name,
      u.email as changed_by_email
    FROM audit_log al
    LEFT JOIN users u ON al.changed_by = u.id
    WHERE al.source_pdf_upload_id = $1
    ORDER BY al.created_at DESC`,
    [pdfUploadId]
  );
}
