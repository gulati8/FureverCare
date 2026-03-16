import { usePetProfileContext } from '../context';
import ImagesTab from '../tabs/ImagesTab';
import { DocumentImportSection } from '../../../components/document-import/DocumentImportSection';
import UpgradeBanner from '../../../components/UpgradeBanner';

export default function DocumentsSection() {
  const { petId, isPremium, imageUploads, loadPetData, pendingDocNav, setPendingDocNav } = usePetProfileContext();

  return (
    <div className="space-y-6 fade-in">
      {/* Images */}
      <div className="card">
        <ImagesTab petId={petId} images={imageUploads} />
      </div>

      {/* Document Import */}
      <div className="card">
        {isPremium ? (
          <DocumentImportSection
            petId={petId}
            onImportComplete={() => loadPetData()}
            navigateToUploadId={pendingDocNav?.uploadId}
            highlightItemId={pendingDocNav?.highlightItemId}
            onNavigationHandled={() => setPendingDocNav(null)}
          />
        ) : (
          <div className="space-y-4">
            <UpgradeBanner type="feature" feature="upload" />
            <p className="text-gray-500 text-center py-4">
              Upgrade to premium to import medical records from PDFs and photos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
