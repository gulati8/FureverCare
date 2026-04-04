import { AuditLogViewer } from '../../../components/audit/AuditLogViewer';

export default function HistoryTab({ petId }: { petId: number }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Change History</h3>
      <p className="text-sm text-surface-600 mb-4">
        View all changes made to your pet's health records, including data imported from PDFs.
      </p>
      <AuditLogViewer petId={petId} />
    </div>
  );
}
