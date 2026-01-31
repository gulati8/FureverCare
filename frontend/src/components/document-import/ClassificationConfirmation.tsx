import { DocumentUpload, DocumentClassification, DetectedDocumentType } from '../../api/client';

interface ClassificationConfirmationProps {
  upload: DocumentUpload;
  classification: DocumentClassification;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<DetectedDocumentType, string> = {
  vaccination_record: 'Vaccination Record',
  visit_summary: 'Vet Visit Summary',
  lab_results: 'Lab Results',
  prescription: 'Prescription',
  medication_label: 'Medication Label',
  pet_id_tag: 'Pet ID / Microchip Card',
  other: 'Medical Document',
};

const DOCUMENT_TYPE_ICONS: Record<DetectedDocumentType, string> = {
  vaccination_record: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  visit_summary: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  lab_results: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  prescription: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  medication_label: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  pet_id_tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  other: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
};

export function ClassificationConfirmation({
  upload,
  classification,
  onConfirm,
  onCancel,
  isProcessing,
}: ClassificationConfirmationProps) {
  const isLowConfidence = classification.confidence < 50;
  const confidenceColor = classification.confidence >= 80
    ? 'text-green-600 bg-green-100'
    : classification.confidence >= 50
    ? 'text-yellow-600 bg-yellow-100'
    : 'text-red-600 bg-red-100';

  const { summary } = classification;
  const totalItems = summary.medications_count + summary.conditions_count + summary.vaccinations_count + summary.allergies_count;

  const summaryParts: string[] = [];
  if (summary.medications_count > 0) {
    summaryParts.push(`${summary.medications_count} medication${summary.medications_count > 1 ? 's' : ''}`);
  }
  if (summary.conditions_count > 0) {
    summaryParts.push(`${summary.conditions_count} condition${summary.conditions_count > 1 ? 's' : ''}`);
  }
  if (summary.vaccinations_count > 0) {
    summaryParts.push(`${summary.vaccinations_count} vaccination${summary.vaccinations_count > 1 ? 's' : ''}`);
  }
  if (summary.allergies_count > 0) {
    summaryParts.push(`${summary.allergies_count} allergy${summary.allergies_count > 1 ? 'allergies' : ''}`);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={DOCUMENT_TYPE_ICONS[classification.document_type]} />
          </svg>
          <span className="font-medium text-gray-900">Document Analysis</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Document info */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            {upload.file_type === 'pdf' ? (
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{upload.original_filename}</p>
            <p className="text-xs text-gray-500">
              {(upload.file_size / 1024).toFixed(1)} KB
            </p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${confidenceColor}`}>
            {classification.confidence}% confident
          </span>
        </div>

        {/* Classification result */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            This looks like a <span className="font-semibold text-blue-700">{DOCUMENT_TYPE_LABELS[classification.document_type].toLowerCase()}</span>.
            {totalItems > 0 && (
              <> I found: <span className="font-medium">{summaryParts.join(', ')}</span>.</>
            )}
          </p>
        </div>

        {/* Low confidence warning */}
        {isLowConfidence && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
            <svg className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Low confidence detection</p>
              <p className="text-xs text-yellow-700 mt-1">
                {classification.explanation || 'The document may be unclear or of a type we haven\'t seen before. Please review the extracted data carefully.'}
              </p>
            </div>
          </div>
        )}

        {/* Summary grid */}
        {totalItems > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {summary.medications_count > 0 && (
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <p className="text-lg font-bold text-purple-700">{summary.medications_count}</p>
                <p className="text-xs text-purple-600">Medications</p>
              </div>
            )}
            {summary.conditions_count > 0 && (
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <p className="text-lg font-bold text-orange-700">{summary.conditions_count}</p>
                <p className="text-xs text-orange-600">Conditions</p>
              </div>
            )}
            {summary.vaccinations_count > 0 && (
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-700">{summary.vaccinations_count}</p>
                <p className="text-xs text-green-600">Vaccinations</p>
              </div>
            )}
            {summary.allergies_count > 0 && (
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <p className="text-lg font-bold text-red-700">{summary.allergies_count}</p>
                <p className="text-xs text-red-600">Allergies</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Import
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
