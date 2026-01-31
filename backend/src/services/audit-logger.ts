import { query } from '../db/pool.js';

export interface AuditLogEntry {
  entityType: string;
  entityId: number;
  action: 'create' | 'update' | 'delete';
  changedBy: number | null;
  source?: 'manual' | 'pdf_import' | 'image_import' | 'document_import';
  sourcePdfUploadId?: number | null;
  sourceImageUploadId?: number | null;
  sourceDocumentUploadId?: number | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  changedFields?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  changed_by: number | null;
  source: string;
  source_pdf_upload_id: number | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: string[] | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

/**
 * Logs an audit entry for entity changes
 */
export async function logAudit(entry: AuditLogEntry): Promise<AuditLog> {
  const result = await query<AuditLog>(
    `INSERT INTO audit_log (
      entity_type, entity_id, action, changed_by, source,
      source_pdf_upload_id, old_values, new_values, changed_fields,
      ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.changedBy,
      entry.source || 'manual',
      entry.sourcePdfUploadId || null,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.changedFields || null,
      entry.ipAddress || null,
      entry.userAgent || null,
    ]
  );
  return result[0];
}

/**
 * Logs a create action
 */
export async function logCreate(
  entityType: string,
  entityId: number,
  newValues: Record<string, any>,
  changedBy: number | null,
  options?: {
    source?: 'manual' | 'pdf_import' | 'image_import' | 'document_import';
    sourcePdfUploadId?: number;
    sourceImageUploadId?: number;
    sourceDocumentUploadId?: number;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<AuditLog> {
  return logAudit({
    entityType,
    entityId,
    action: 'create',
    changedBy,
    newValues,
    changedFields: Object.keys(newValues),
    ...options,
  });
}

/**
 * Logs an update action with automatic field diffing
 */
export async function logUpdate(
  entityType: string,
  entityId: number,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  changedBy: number | null,
  options?: {
    source?: 'manual' | 'pdf_import' | 'image_import' | 'document_import';
    sourcePdfUploadId?: number;
    sourceImageUploadId?: number;
    sourceDocumentUploadId?: number;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<AuditLog> {
  // Calculate changed fields
  const changedFields: string[] = [];
  for (const key of Object.keys(newValues)) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changedFields.push(key);
    }
  }

  // Only log if there are actual changes
  if (changedFields.length === 0) {
    return {} as AuditLog; // No changes to log
  }

  return logAudit({
    entityType,
    entityId,
    action: 'update',
    changedBy,
    oldValues,
    newValues,
    changedFields,
    ...options,
  });
}

/**
 * Logs a delete action
 */
export async function logDelete(
  entityType: string,
  entityId: number,
  oldValues: Record<string, any>,
  changedBy: number | null,
  options?: {
    source?: 'manual' | 'pdf_import' | 'image_import' | 'document_import';
    sourcePdfUploadId?: number;
    sourceImageUploadId?: number;
    sourceDocumentUploadId?: number;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<AuditLog> {
  return logAudit({
    entityType,
    entityId,
    action: 'delete',
    changedBy,
    oldValues,
    changedFields: Object.keys(oldValues),
    ...options,
  });
}

/**
 * Helper to extract request metadata for audit logging
 */
export function extractRequestMetadata(req: any): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
  };
}
