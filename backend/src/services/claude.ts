import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/index.js';
import { RecordType } from '../models/pdf-extraction.js';
import { RecordType as ImageRecordType } from '../models/image-extraction.js';
import { storage } from './storage.js';

const anthropic = new Anthropic({
  apiKey: config.claude.apiKey,
});

export interface ExtractedItem {
  recordType: RecordType;
  data: Record<string, any>;
  confidence: number;
}

export interface ExtractionResult {
  documentType: string;
  petName?: string;
  items: ExtractedItem[];
  rawResponse: Record<string, any>;
  tokensUsed: number;
  model: string;
}

const EXTRACTION_PROMPT = `You are analyzing a veterinary document (PDF) for a pet health records system. Extract all relevant health information from this document.

For each piece of information you find, categorize it into one of these record types:
- vaccination: Vaccine records (name, date administered, expiration date, administered by, lot number)
- medication: Prescriptions or medications (name, dosage, frequency, start date, end date, prescribing vet, notes)
- condition: Medical conditions or diagnoses (name, diagnosed date, severity, notes)
- allergy: Allergies (allergen, reaction, severity)
- vet: Veterinarian/clinic information (clinic name, vet name, phone, email, address)
- emergency_contact: Emergency contacts mentioned (name, relationship, phone, email)

For each extracted item, also provide a confidence score from 0.0 to 1.0:
- 1.0: Information is clearly and explicitly stated
- 0.8-0.9: Information is clearly stated but might have minor ambiguity
- 0.5-0.7: Information is inferred or partially legible
- Below 0.5: Information is unclear or guessed

Respond with a JSON object in this exact format:
{
  "documentType": "vaccination_record" | "visit_summary" | "lab_results" | "prescription" | "other",
  "petName": "Name of pet if mentioned",
  "items": [
    {
      "recordType": "vaccination",
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
      "recordType": "medication",
      "data": {
        "name": "Apoquel",
        "dosage": "16mg",
        "frequency": "Once daily",
        "start_date": "2024-01-15",
        "end_date": null,
        "prescribing_vet": "Dr. Smith",
        "notes": "For allergies",
        "is_active": true
      },
      "confidence": 0.9
    }
  ]
}

Field formats:
- Dates should be in YYYY-MM-DD format when possible, or null if not available
- severity should be: "mild", "moderate", or "severe" for conditions; "mild", "moderate", "severe", or "life-threatening" for allergies
- is_active for medications should be true for current prescriptions
- is_primary for vets should be true if this appears to be the primary vet

Only extract information that is actually present in the document. Do not make up or assume information.
If no relevant health information is found, return an empty items array.`;

export async function extractPetDataFromPdf(pdfPath: string): Promise<ExtractionResult> {
  // Download from storage (works with both local paths and S3 keys)
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await storage.download(pdfPath, 'pdfs');
  } catch (err) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  const pdfBase64 = pdfBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: config.claude.model,
    max_tokens: config.claude.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  // Extract the text response
  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse the JSON response
  let parsed: any;
  try {
    // Try to find JSON in the response (Claude sometimes includes markdown code blocks)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse Claude response:', textContent.text);
    throw new Error(`Failed to parse extraction response: ${e}`);
  }

  // Validate and transform the response
  const items: ExtractedItem[] = (parsed.items || []).map((item: any) => ({
    recordType: item.recordType as RecordType,
    data: item.data || {},
    confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
  }));

  // Calculate tokens used
  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return {
    documentType: parsed.documentType || 'other',
    petName: parsed.petName,
    items,
    rawResponse: parsed,
    tokensUsed,
    model: config.claude.model,
  };
}

export function validateExtractionItemData(recordType: RecordType, data: Record<string, any>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  switch (recordType) {
    case 'vaccination':
      if (!data.name) errors.push('Vaccination name is required');
      if (!data.administered_date) errors.push('Administered date is required');
      break;

    case 'medication':
      if (!data.name) errors.push('Medication name is required');
      break;

    case 'condition':
      if (!data.name) errors.push('Condition name is required');
      break;

    case 'allergy':
      if (!data.allergen) errors.push('Allergen is required');
      break;

    case 'vet':
      if (!data.clinic_name) errors.push('Clinic name is required');
      break;

    case 'emergency_contact':
      if (!data.name) errors.push('Contact name is required');
      if (!data.phone) errors.push('Phone number is required');
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function mapExtractionToHealthRecord(recordType: RecordType, data: Record<string, any>): Record<string, any> {
  // Ensure data matches our database schema
  switch (recordType) {
    case 'vaccination':
      return {
        name: data.name,
        administered_date: data.administered_date,
        expiration_date: data.expiration_date || null,
        administered_by: data.administered_by || null,
        lot_number: data.lot_number || null,
      };

    case 'medication':
      return {
        name: data.name,
        dosage: data.dosage || null,
        frequency: data.frequency || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        prescribing_vet: data.prescribing_vet || null,
        notes: data.notes || null,
        is_active: data.is_active !== false,
      };

    case 'condition':
      return {
        name: data.name,
        diagnosed_date: data.diagnosed_date || null,
        notes: data.notes || null,
        severity: data.severity || null,
      };

    case 'allergy':
      return {
        allergen: data.allergen,
        reaction: data.reaction || null,
        severity: data.severity || null,
      };

    case 'vet':
      return {
        clinic_name: data.clinic_name,
        vet_name: data.vet_name || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        is_primary: data.is_primary || false,
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

// Image extraction prompt - optimized for photos of documents, labels, cards
const IMAGE_EXTRACTION_PROMPT = `You are analyzing an image related to pet health records. This could be a photo of:
- A vaccination card or certificate
- A medication label or prescription bottle
- A pet ID tag or microchip card
- A veterinary visit summary or medical record
- Any other pet health-related document or label

Extract all relevant health information from this image.

For each piece of information you find, categorize it into one of these record types:
- vaccination: Vaccine records (name, date administered, expiration date, administered by, lot number)
- medication: Prescriptions or medications (name, dosage, frequency, start date, end date, prescribing vet, notes)
- condition: Medical conditions or diagnoses (name, diagnosed date, severity, notes)
- allergy: Allergies (allergen, reaction, severity)
- vet: Veterinarian/clinic information (clinic name, vet name, phone, email, address)
- emergency_contact: Emergency contacts mentioned (name, relationship, phone, email)

For each extracted item, provide a confidence score from 0.0 to 1.0:
- 1.0: Information is clearly and explicitly visible/legible
- 0.8-0.9: Information is clearly stated but might have minor blur or ambiguity
- 0.5-0.7: Information is partially legible or inferred from context
- Below 0.5: Information is unclear, guessed, or extrapolated

Respond with a JSON object in this exact format:
{
  "documentType": "vaccination_card" | "medication_label" | "pet_id_tag" | "medical_record" | "other",
  "petName": "Name of pet if visible",
  "items": [
    {
      "recordType": "vaccination",
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
      "recordType": "medication",
      "data": {
        "name": "Apoquel",
        "dosage": "16mg",
        "frequency": "Once daily",
        "start_date": "2024-01-15",
        "end_date": null,
        "prescribing_vet": "Dr. Smith",
        "notes": "For allergies",
        "is_active": true
      },
      "confidence": 0.9
    }
  ]
}

Field formats:
- Dates should be in YYYY-MM-DD format when possible, or null if not available
- severity should be: "mild", "moderate", or "severe" for conditions; "mild", "moderate", "severe", or "life-threatening" for allergies
- is_active for medications should be true for current prescriptions
- is_primary for vets should be true if this appears to be the primary vet

Only extract information that is actually visible in the image. Do not make up or assume information.
If the image is blurry, poorly lit, or partially obscured, adjust confidence scores accordingly.
If no relevant health information is found, return an empty items array.`;

export interface ImageExtractionResult {
  documentType: string;
  petName?: string;
  items: ExtractedItem[];
  rawResponse: Record<string, any>;
  tokensUsed: number;
  model: string;
}

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
      return 'image/jpeg'; // Default to JPEG
  }
}

export async function extractPetDataFromImage(imagePath: string): Promise<ImageExtractionResult> {
  // Download from storage (works with both local paths and S3 keys)
  let imageBuffer: Buffer;
  try {
    imageBuffer = await storage.download(imagePath, 'images');
  } catch (err) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const imageBase64 = imageBuffer.toString('base64');
  const mediaType = getMimeType(imagePath);

  const response = await anthropic.messages.create({
    model: config.claude.model,
    max_tokens: config.claude.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: IMAGE_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  // Extract the text response
  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse the JSON response
  let parsed: any;
  try {
    // Try to find JSON in the response (Claude sometimes includes markdown code blocks)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse Claude response:', textContent.text);
    throw new Error(`Failed to parse extraction response: ${e}`);
  }

  // Validate and transform the response
  const items: ExtractedItem[] = (parsed.items || []).map((item: any) => ({
    recordType: item.recordType as ImageRecordType,
    data: item.data || {},
    confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
  }));

  // Calculate tokens used
  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return {
    documentType: parsed.documentType || 'other',
    petName: parsed.petName,
    items,
    rawResponse: parsed,
    tokensUsed,
    model: config.claude.model,
  };
}
