import { EmergencyCard as EmergencyCardData } from '../api/client';
import EmergencyCard from './EmergencyCard';

interface Props {
  card: EmergencyCardData;
  resolvePhotoUrl?: (url: string | null) => string | null;
}

export default function EmergencyCardView({ card, resolvePhotoUrl }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface-100)' }}>
      <EmergencyCard card={card} resolvePhotoUrl={resolvePhotoUrl} />
    </div>
  );
}
