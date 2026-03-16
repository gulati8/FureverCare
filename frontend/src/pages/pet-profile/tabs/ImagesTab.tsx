import { useState } from 'react';
import { API_URL, DocumentUpload } from '../../../api/client';

export default function ImagesTab({ petId, images }: { petId: number; images: DocumentUpload[] }) {
  const [selectedImage, setSelectedImage] = useState<DocumentUpload | null>(null);

  const getImageUrl = (upload: DocumentUpload) =>
    `${API_URL}/api/pets/${petId}/documents/uploads/${upload.id}/file`;

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No images yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload images from the Import Documents tab.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Images
          <span className="ml-2 text-sm font-normal text-gray-500">({images.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
            onClick={() => setSelectedImage(img)}
          >
            <div className="aspect-square">
              <img
                src={getImageUrl(img)}
                alt={img.user_tag || img.original_filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {img.user_tag || img.original_filename}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {img.date_taken && (
                  <p className="text-xs text-gray-500">
                    {new Date(img.date_taken).toLocaleDateString()}
                  </p>
                )}
                {img.body_area && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {img.body_area}
                  </span>
                )}
              </div>
              {img.user_description && (
                <p className="text-xs text-gray-500 mt-1 truncate">{img.user_description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 z-10 bg-white bg-opacity-90 rounded-full p-1.5 text-gray-600 hover:text-gray-900 hover:bg-opacity-100 shadow-sm"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center justify-center bg-gray-900 max-h-[70vh]">
              <img
                src={getImageUrl(selectedImage)}
                alt={selectedImage.user_tag || selectedImage.original_filename}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-4 border-t">
              <h4 className="font-medium text-gray-900">
                {selectedImage.user_tag || selectedImage.original_filename}
              </h4>
              {selectedImage.user_description && (
                <p className="text-sm text-gray-600 mt-1">{selectedImage.user_description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                {selectedImage.date_taken && (
                  <span>Date: {new Date(selectedImage.date_taken).toLocaleDateString()}</span>
                )}
                {selectedImage.body_area && (
                  <span>Area: {selectedImage.body_area}</span>
                )}
                <span>Uploaded: {new Date(selectedImage.created_at).toLocaleDateString()}</span>
              </div>
              <div className="mt-3">
                <a
                  href={getImageUrl(selectedImage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Open full size
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
