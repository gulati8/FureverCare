import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { API_URL, documentsApi, DocumentUpload } from '../../api/client';

const TAG_SUGGESTIONS = [
  'X-ray',
  'Lab result',
  'Wound photo',
  'Teeth/Dental',
  'Vaccination card',
  'Medication label',
  'Weight record',
  'Skin condition',
  'Before/After',
  'Other',
];

interface ImageReviewFormProps {
  petId: number;
  upload: DocumentUpload;
  exifDateTaken?: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ImageReviewForm({ petId, upload, exifDateTaken, onSave, onCancel }: ImageReviewFormProps) {
  const { token } = useAuth();
  const [tag, setTag] = useState(upload.user_tag || '');
  const [description, setDescription] = useState(upload.user_description || '');
  const [dateTaken, setDateTaken] = useState(() => {
    // Pre-fill from saved value, EXIF, or leave empty
    const dateStr = upload.date_taken || exifDateTaken;
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  });
  const [bodyArea, setBodyArea] = useState(upload.body_area || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = `${API_URL}/api/pets/${petId}/documents/uploads/${upload.id}/file`;

  const handleSave = async () => {
    if (!token) return;

    if (!tag.trim()) {
      setError('Tag is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await documentsApi.saveImageMetadata(
        petId,
        upload.id,
        {
          userTag: tag.trim(),
          userDescription: description.trim() || undefined,
          dateTaken: dateTaken || undefined,
          bodyArea: bodyArea.trim() || undefined,
        },
        token
      );
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Review Image</h3>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back to uploads
        </button>
      </div>

      {/* Image preview */}
      <div className="bg-gray-100 rounded-lg p-4 flex justify-center">
        <img
          src={imageUrl}
          alt={upload.original_filename}
          className="max-h-72 rounded shadow-sm object-contain"
        />
      </div>

      <p className="text-sm text-gray-500 text-center">{upload.original_filename}</p>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Tag (required) */}
        <div>
          <label htmlFor="image-tag" className="block text-sm font-medium text-gray-700 mb-1">
            Tag <span className="text-red-500">*</span>
          </label>
          <input
            id="image-tag"
            type="text"
            list="tag-suggestions"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. X-ray, Wound photo, Lab result"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            maxLength={100}
          />
          <datalist id="tag-suggestions">
            {TAG_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {/* Description (optional) */}
        <div>
          <label htmlFor="image-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="image-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this image"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Date taken */}
        <div>
          <label htmlFor="image-date-taken" className="block text-sm font-medium text-gray-700 mb-1">
            Date Taken
          </label>
          <input
            id="image-date-taken"
            type="date"
            value={dateTaken}
            onChange={(e) => setDateTaken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {exifDateTaken && !upload.date_taken && (
            <p className="text-xs text-gray-400 mt-1">Pre-filled from image EXIF data</p>
          )}
        </div>

        {/* Body area (optional) */}
        <div>
          <label htmlFor="image-body-area" className="block text-sm font-medium text-gray-700 mb-1">
            Body Area
          </label>
          <input
            id="image-body-area"
            type="text"
            value={bodyArea}
            onChange={(e) => setBodyArea(e.target.value)}
            placeholder='e.g. "Left hind leg", "Teeth", "Abdomen"'
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            maxLength={100}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !tag.trim()}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
