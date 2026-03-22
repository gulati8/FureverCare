import { usePetProfileContext } from '../context';
import ImagesTab from '../tabs/ImagesTab';
import { DocumentImportSection } from '../../../components/document-import/DocumentImportSection';
export default function DocumentsSection() {
  const { petId, imageUploads, loadPetData, pendingDocNav, setPendingDocNav } = usePetProfileContext();

  return (
    <div className="space-y-6 fade-in">
      {/* Images */}
      <div className="card">
        <ImagesTab petId={petId} images={imageUploads} />
      </div>

      {/* Document Import */}
      <div className="card">
        <DocumentImportSection
          petId={petId}
          onImportComplete={() => loadPetData()}
          navigateToUploadId={pendingDocNav?.uploadId}
          highlightItemId={pendingDocNav?.highlightItemId}
          onNavigationHandled={() => setPendingDocNav(null)}
        />
      </div>
    </div>
  );
}
