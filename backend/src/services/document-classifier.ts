import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/index.js';
import { DocumentType, MediaType } from '../models/document-upload.js';
import { RecordType } from '../models/document-extraction.js';
import { storage } from './storage.js';

const anthropic = new Anthropic({
  apiKey: config.claude.apiKey,
});

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  explanation: string;
  alternativeTypes?: string[];
  petName?: string;
  tokensUsed: number;
  model: string;
}

export interface ExtractedItem {
  recordType: RecordType;
  data: Record<string, any>;
  confidence: number;
}

export interface ExtractionResult {
  petName?: string;
  items: ExtractedItem[];
  summary: {
    totalItems: number;
    byCategory: Record<string, number>;
  };
  rawResponse: Record<string, any>;
  tokensUsed: number;
  model: string;
}

export interface ClassifyAndExtractResult {
  classification: ClassificationResult;
  extraction: ExtractionResult;
}

const CLASSIFICATION_PROMPT = `Analyze this document and determine what type of pet health document it is.

Possible document types:
- medication_label: Prescription labels, medication bottles, drug packaging
- vet_visit_summary: Veterinary visit summaries, exam reports, discharge notes
- lab_results: Blood work, urinalysis, diagnostic test results
- vaccination_record: Vaccination certificates, immunization records
- receipt: Veterinary invoices, pharmacy receipts, payment records
- insurance_form: Pet insurance claims, coverage documents, EOBs
- pet_id: Microchip registration, ID tags, pet licenses
- medical_history: Comprehensive health records, transferred records
- prescription: Written prescriptions, refill authorizations
- other: Documents that don't fit other categories

Evaluate the document and provide:
1. The most likely document type
2. A confidence score from 0-100
3. A brief explanation of why you classified it this way
4. Any alternative types it could be (if confidence < 80)

Respond with a JSON object:
{
  "document_type": "medication_label",
  "confidence": 85,
  "explanation": "Document shows a prescription label with drug name, dosage, and pharmacy information",
  "alternative_types": ["prescription"],
  "pet_name": "Max"
}

If confidence is below 50%, explain what makes the document difficult to classify.
Only classify based on what you can actually see - do not guess.`;

const EXTRACTION_PROMPT = `Extract all relevant pet health information from this document.

For each piece of information found, categorize it into one of these record types:
- vaccination: Vaccine records (name, date administered, expiration date, administered by, lot number)
- medication: Prescriptions or medications (name, dosage, frequency, start date, end date, prescribing vet, notes, show_on_card)
- condition: Medical conditions or diagnoses (name, diagnosed date, severity, notes, show_on_card)
- allergy: Allergies (allergen, reaction, severity, show_on_card)
- vet: Veterinarian/clinic information (clinic name, vet name, phone, email, address)
- emergency_contact: Emergency contacts mentioned (name, relationship, phone, email)

For each extracted item, provide a confidence score from 0.0 to 1.0:
- 1.0: Information is clearly and explicitly stated
- 0.8-0.9: Information is clearly stated but might have minor ambiguity
- 0.5-0.7: Information is inferred or partially legible
- Below 0.5: Information is unclear or guessed

Respond with a JSON object:
{
  "pet_name": "Name of pet if visible",
  "items": [
    {
      "record_type": "vaccination",
      "data": {
        "name": "Rabies",
        "administered_date": "2024-01-15",
        "expiration_date": "2025-01-15",
        "administered_by": "Dr. Smith",
        "lot_number": "ABC123"
      },
      "confidence": 0.95
    },
    {
      "record_type": "medication",
      "data": {
        "name": "Apoquel",
        "dosage": "16mg",
        "frequency": "Once daily",
        "start_date": "2024-01-15",
        "end_date": null,
        "prescribing_vet": "Dr. Smith",
        "notes": "For allergies",
        "is_active": true,
        "show_on_card": false
      },
      "confidence": 0.9
    }
  ],
  "summary": {
    "total_items": 2,
    "by_category": {
      "medications": 1,
      "vaccinations": 1,
      "conditions": 0,
      "allergies": 0
    }
  }
}

Field formats:
- Dates should be in YYYY-MM-DD format when possible, or null if not available
- severity should be: "mild", "moderate", or "severe" for conditions
- severity for allergies: "mild", "moderate", "severe", or "life-threatening"
- is_active for medications should be true for current prescriptions
- show_on_card indicates whether this item should appear as an alert on the pet's emergency card:
  - For allergies: true if severity is "life-threatening" or "severe"
  - For conditions: true if the condition is clinically significant and would affect emergency treatment (e.g., epilepsy, heart disease, diabetes). False for minor/resolved conditions.
  - For medications: true if the medication has critical drug interactions or the pet must not miss doses (e.g., insulin, anti-seizure, heart medication). False for routine supplements or topicals.

Only extract information that is actually present in the document.
Do not make up or assume information.
If no relevant health information is found, return an empty items array.`;

function getMimeType(filePath: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

interface DocumentContent {
  type: 'document';
  source: {
    type: 'base64';
    media_type: 'application/pdf';
    data: string;
  };
}

interface ImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

type FileContent = DocumentContent | ImageContent;

async function buildDocumentContent(filePath: string, mediaType: MediaType): Promise<FileContent> {
  // Download from storage (works with both local paths and S3 keys)
  let fileBuffer: Buffer;
  try {
    fileBuffer = await storage.download(filePath, 'documents');
  } catch (err) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileBase64 = fileBuffer.toString('base64');

  if (mediaType === 'pdf') {
    return {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: fileBase64,
      },
    };
  } else {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: getMimeType(filePath),
        data: fileBase64,
      },
    };
  }
}

export async function classifyDocument(
  filePath: string,
  mediaType: MediaType
): Promise<ClassificationResult> {
  const documentContent = await buildDocumentContent(filePath, mediaType);

  const response = await anthropic.messages.create({
    model: config.claude.model,
    max_tokens: config.claude.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          documentContent as any,
          {
            type: 'text',
            text: CLASSIFICATION_PROMPT,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let parsed: any;
  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse Claude classification response:', textContent.text);
    throw new Error(`Failed to parse classification response: ${e}`);
  }

  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return {
    documentType: (parsed.document_type || 'other') as DocumentType,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    explanation: parsed.explanation || 'Unable to determine document type',
    alternativeTypes: parsed.alternative_types,
    petName: parsed.pet_name,
    tokensUsed,
    model: config.claude.model,
  };
}

export async function extractDocumentData(
  filePath: string,
  mediaType: MediaType,
  documentType?: DocumentType
): Promise<ExtractionResult> {
  const documentContent = await buildDocumentContent(filePath, mediaType);

  const typeHint = documentType ? `\n\nThis appears to be a ${documentType.replace(/_/g, ' ')}.` : '';

  const response = await anthropic.messages.create({
    model: config.claude.model,
    max_tokens: config.claude.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          documentContent as any,
          {
            type: 'text',
            text: EXTRACTION_PROMPT + typeHint,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let parsed: any;
  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse Claude extraction response:', textContent.text);
    throw new Error(`Failed to parse extraction response: ${e}`);
  }

  const items: ExtractedItem[] = (parsed.items || []).map((item: any) => ({
    recordType: item.record_type as RecordType,
    data: item.data || {},
    confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
  }));

  // Build summary
  const byCategory: Record<string, number> = {
    medications: 0,
    vaccinations: 0,
    conditions: 0,
    allergies: 0,
    vets: 0,
    emergency_contacts: 0,
  };

  for (const item of items) {
    switch (item.recordType) {
      case 'medication':
        byCategory.medications++;
        break;
      case 'vaccination':
        byCategory.vaccinations++;
        break;
      case 'condition':
        byCategory.conditions++;
        break;
      case 'allergy':
        byCategory.allergies++;
        break;
      case 'vet':
        byCategory.vets++;
        break;
      case 'emergency_contact':
        byCategory.emergency_contacts++;
        break;
    }
  }

  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return {
    petName: parsed.pet_name,
    items,
    summary: {
      totalItems: items.length,
      byCategory,
    },
    rawResponse: parsed,
    tokensUsed,
    model: config.claude.model,
  };
}

export async function classifyAndExtractDocument(
  filePath: string,
  mediaType: MediaType
): Promise<ClassifyAndExtractResult> {
  // First, classify the document
  const classification = await classifyDocument(filePath, mediaType);

  // Then extract data with the classification hint
  const extraction = await extractDocumentData(
    filePath,
    mediaType,
    classification.confidence >= 50 ? classification.documentType : undefined
  );

  return {
    classification,
    extraction,
  };
}

/**
 * Detect the precision of a date string extracted from a document.
 * - Full date (YYYY-MM-DD or similar) -> 'day'
 * - Month+year (e.g., "March 2024", "2024-03") -> 'month'
 * - Year only (e.g., "2024") -> 'year'
 */
function detectDatePrecision(dateStr: string | null | undefined): 'day' | 'month' | 'year' {
  if (!dateStr) return 'day';

  const cleaned = dateStr.trim();

  // Year only: exactly 4 digits
  if (/^\d{4}$/.test(cleaned)) return 'year';

  // Month + year patterns: "2024-03", "March 2024", "Mar 2024", "03/2024"
  if (/^\d{4}-\d{2}$/.test(cleaned)) return 'month';
  if (/^[A-Za-z]+\s+\d{4}$/.test(cleaned)) return 'month';
  if (/^\d{2}\/\d{4}$/.test(cleaned)) return 'month';

  // Full date: YYYY-MM-DD or other patterns with day component
  return 'day';
}

/**
 * Normalize a date string to YYYY-MM-DD format, filling in missing components:
 * - Year only -> YYYY-01-01
 * - Month+year -> YYYY-MM-01
 * - Full date -> YYYY-MM-DD
 */
function normalizeDateForStorage(dateStr: string | null | undefined, precision: 'day' | 'month' | 'year'): string | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  if (precision === 'year') {
    const yearMatch = cleaned.match(/(\d{4})/);
    return yearMatch ? `${yearMatch[1]}-01-01` : null;
  }

  if (precision === 'month') {
    // Handle YYYY-MM
    const yymm = cleaned.match(/^(\d{4})-(\d{2})$/);
    if (yymm) return `${yymm[1]}-${yymm[2]}-01`;

    // Handle "Month YYYY"
    const monthNames: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04',
      jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const monthYear = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (monthYear) {
      const mm = monthNames[monthYear[1].toLowerCase()];
      if (mm) return `${monthYear[2]}-${mm}-01`;
    }

    // Handle MM/YYYY
    const mmyyyy = cleaned.match(/^(\d{2})\/(\d{4})$/);
    if (mmyyyy) return `${mmyyyy[2]}-${mmyyyy[1]}-01`;
  }

  // For 'day' precision, return as-is (should already be YYYY-MM-DD)
  return cleaned;
}

export function mapExtractionToHealthRecord(recordType: RecordType, data: Record<string, any>): Record<string, any> {
  switch (recordType) {
    case 'vaccination': {
      const adminPrecision = detectDatePrecision(data.administered_date);
      const expPrecision = detectDatePrecision(data.expiration_date);
      return {
        name: data.name,
        administered_date: normalizeDateForStorage(data.administered_date, adminPrecision) || data.administered_date,
        administered_date_precision: adminPrecision,
        expiration_date: normalizeDateForStorage(data.expiration_date, expPrecision) || data.expiration_date || null,
        expiration_date_precision: expPrecision,
        administered_by: data.administered_by || null,
        lot_number: data.lot_number || null,
      };
    }

    case 'medication': {
      const startPrecision = detectDatePrecision(data.start_date);
      const endPrecision = detectDatePrecision(data.end_date);
      return {
        name: data.name,
        dosage: data.dosage || null,
        frequency: data.frequency || null,
        start_date: normalizeDateForStorage(data.start_date, startPrecision) || data.start_date || null,
        start_date_precision: startPrecision,
        end_date: normalizeDateForStorage(data.end_date, endPrecision) || data.end_date || null,
        end_date_precision: endPrecision,
        prescribing_vet: data.prescribing_vet || null,
        notes: data.notes || null,
        is_active: data.is_active !== false,
        show_on_card: data.show_on_card ?? false,
      };
    }

    case 'condition': {
      const diagPrecision = detectDatePrecision(data.diagnosed_date);
      return {
        name: data.name,
        diagnosed_date: normalizeDateForStorage(data.diagnosed_date, diagPrecision) || data.diagnosed_date || null,
        diagnosed_date_precision: diagPrecision,
        notes: data.notes || null,
        severity: data.severity || null,
        show_on_card: data.show_on_card ?? false,
      };
    }

    case 'allergy':
      return {
        allergen: data.allergen,
        reaction: data.reaction || null,
        severity: data.severity || null,
        show_on_card: data.show_on_card ?? (data.severity === 'life-threatening' || data.severity === 'severe'),
      };

    case 'vet':
      return {
        clinic_name: data.clinic_name,
        vet_name: data.vet_name || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        is_primary: false, // Always false - user will choose primary vet
      };

    case 'emergency_contact':
      return {
        name: data.name,
        relationship: data.relationship || null,
        phone: data.phone,
        email: data.email || null,
        is_primary: data.is_primary || false,
      };

    default:
      return data;
  }
}

export function generateExtractedItemsSummary(byCategory: Record<string, number>): string {
  const parts: string[] = [];

  if (byCategory.medications > 0) {
    parts.push(`${byCategory.medications} medication${byCategory.medications > 1 ? 's' : ''}`);
  }
  if (byCategory.vaccinations > 0) {
    parts.push(`${byCategory.vaccinations} vaccination${byCategory.vaccinations > 1 ? 's' : ''}`);
  }
  if (byCategory.conditions > 0) {
    parts.push(`${byCategory.conditions} condition${byCategory.conditions > 1 ? 's' : ''}`);
  }
  if (byCategory.allergies > 0) {
    parts.push(`${byCategory.allergies} allergy${byCategory.allergies > 1 ? 'ies' : ''}`);
  }
  if (byCategory.vets > 0) {
    parts.push(`${byCategory.vets} vet${byCategory.vets > 1 ? 's' : ''}`);
  }
  if (byCategory.emergency_contacts > 0) {
    parts.push(`${byCategory.emergency_contacts} emergency contact${byCategory.emergency_contacts > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'No health records found';
  }

  return `Found: ${parts.join(', ')}`;
}
