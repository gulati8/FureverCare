import { Link } from 'react-router-dom';
import { EmergencyCard } from '../api/client';

const KG_TO_LBS = 2.20462;

function formatWeight(value: number | string, unit: 'lbs' | 'kg' | null): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const safeUnit = unit || 'kg';
  if (safeUnit === 'lbs') {
    const kg = numValue / KG_TO_LBS;
    return `${numValue.toFixed(1)} lbs / ${kg.toFixed(1)} kg`;
  } else {
    const lbs = numValue * KG_TO_LBS;
    return `${lbs.toFixed(1)} lbs / ${numValue.toFixed(1)} kg`;
  }
}

function primaryWeight(value: number | string, unit: 'lbs' | 'kg' | null): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const safeUnit = unit || 'kg';
  if (safeUnit === 'lbs') {
    return `${numValue.toFixed(1)} lbs`;
  }
  return `${numValue.toFixed(1)} kg`;
}

interface AlertItem {
  type: 'allergy' | 'medication' | 'condition' | 'vaccination';
  title: string;
  detail: string;
}

function buildAlerts(card: EmergencyCard): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (card.custom_alerts) {
    for (const a of card.custom_alerts) {
      alerts.push({ type: 'condition', title: a.alert_text, detail: 'Owner alert' });
    }
  }

  for (const a of card.allergies) {
    const severity = a.severity === 'life-threatening' ? ' (ANAPHYLAXIS RISK)' :
      a.severity === 'severe' ? ' (SEVERE)' : '';
    alerts.push({
      type: 'allergy',
      title: `${a.allergen} Allergy${severity}`,
      detail: a.reaction ? `Reaction: ${a.reaction}` : 'Avoid this allergen',
    });
  }

  for (const m of card.medications) {
    alerts.push({
      type: 'medication',
      title: `On ${m.name}${m.notes ? ` - ${m.notes}` : ''}`,
      detail: [m.dosage, m.frequency].filter(Boolean).join(' '),
    });
  }

  for (const c of card.conditions) {
    alerts.push({
      type: 'condition',
      title: c.name,
      detail: c.notes || 'Monitor during procedures',
    });
  }

  for (const v of card.vaccinations) {
    const isExpired = v.expiration_date && new Date(v.expiration_date) < new Date();
    alerts.push({
      type: 'vaccination',
      title: `${v.name}${isExpired ? ' (EXPIRED)' : ''}`,
      detail: v.expiration_date
        ? `${isExpired ? 'Expired' : 'Expires'}: ${new Date(v.expiration_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`
        : `Given ${new Date(v.administered_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`,
    });
  }

  return alerts;
}

interface Props {
  card: EmergencyCard;
  resolvePhotoUrl?: (url: string | null) => string | null;
}

export default function EmergencyCardView({ card, resolvePhotoUrl }: Props) {
  const { pet, owner, veterinarians, emergency_contacts } = card;
  const alerts = buildAlerts(card);
  const hasAlerts = alerts.length > 0;

  const photoUrl = resolvePhotoUrl ? resolvePhotoUrl(pet.photo_url) : pet.photo_url;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface-100)' }}>
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-50"
        style={{ background: 'var(--color-danger)', color: 'white', padding: '14px 16px' }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="9" y="2" width="6" height="20" rx="2"/><rect x="2" y="9" width="20" height="6" rx="2"/></svg>
          </div>
          <div>
            <h1 style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-body)' }}>EMERGENCY PET CARD</h1>
            <p style={{ fontSize: '0.6875rem', opacity: 0.8, fontFamily: 'var(--font-body)' }}>FureverCare</p>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      {hasAlerts ? (
        <div style={{ background: 'var(--color-danger-dark)', padding: '14px 16px' }}>
          <div className="max-w-lg mx-auto">
            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.8125rem', letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
              {alerts.length} Alert{alerts.length !== 1 ? 's' : ''} for {pet.name}
            </div>
            <div className="flex flex-col gap-2">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFCDD2">
                      {alert.type === 'allergy' && <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>}
                      {alert.type === 'medication' && <path d="M4.22 11.29l5.07-5.07c1.95-1.95 5.12-1.95 7.07 0s1.95 5.12 0 7.07l-5.07 5.07c-1.95 1.95-5.12 1.95-7.07 0s-1.95-5.12 0-7.07z"/>}
                      {alert.type === 'condition' && <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>}
                      {alert.type === 'vaccination' && <path d="M19.59 3L16 6.59 14.41 5 13 6.41l1.59 1.59-4.24 4.24-1.18-1.18-1.41 1.41 1.18 1.18L7 15.59V19h3.41l1.94-1.94 1.18 1.18 1.41-1.41-1.18-1.18 4.24-4.24 1.59 1.59L21 11.59 19.41 10 23 6.41 19.59 3z"/>}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>{alert.title}</p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', marginTop: '2px' }}>{alert.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--color-success)', color: 'white', padding: '24px 16px', textAlign: 'center' as const }}>
          <div className="max-w-lg mx-auto">
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' }}>
              ✓
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No known allergies or critical conditions</p>
            <p style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px' }}>
              {pet.name} &bull; {pet.breed || pet.species}
              {pet.weight_kg ? ` \u2022 ${primaryWeight(pet.weight_kg, pet.weight_unit)}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Pet Quick Info */}
      <div style={{ background: 'var(--color-white)', borderBottom: '1px solid var(--color-surface-200)', padding: '14px 16px' }}>
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div
            className="flex-shrink-0"
            style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--color-navy)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#4A7FB5">
                <path d="M12 2C9.24 2 7 4.24 7 7c0 1.38.56 2.63 1.46 3.54C7.56 11.37 7 12.62 7 14v4c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-4c0-1.38-.56-2.63-1.46-3.46C16.44 9.63 17 8.38 17 7c0-2.76-2.24-5-5-5z"/>
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{pet.name}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-600)' }}>
              {pet.breed && <span className="capitalize">{pet.breed}</span>}
              {pet.breed && pet.sex && ' \u2022 '}
              {pet.sex && <span className="capitalize">{pet.sex}{pet.is_fixed ? ', Fixed' : ''}</span>}
              {(pet.breed || pet.sex) && pet.age && ' \u2022 '}
              {pet.age && <span>{pet.age}</span>}
              {pet.weight_kg && ` \u2022 ${primaryWeight(pet.weight_kg, pet.weight_unit)}`}
            </p>
            {pet.microchip_id && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--color-surface-400)', fontFamily: 'monospace', marginTop: '4px' }}>
                Microchip: {pet.microchip_id}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Special Instructions */}
        {pet.special_instructions && (
          <div style={{
            background: 'var(--color-warning-light)',
            border: '1px solid #FFF9C4',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
          }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-warning)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#8B6914' }}>
                Special Instructions
              </span>
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>{pet.special_instructions}</p>
          </div>
        )}

        {/* Emergency Contacts */}
        <section>
          <h3 className="flex items-center gap-2" style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-surface-700)', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-steel-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-steel)"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            </div>
            Emergency Contacts
          </h3>
          <div className="flex flex-col gap-3">
            {/* Owner */}
            {owner && (
              <div className="flex items-center gap-3" style={{ padding: '16px', border: '1px solid var(--color-surface-200)', borderRadius: 'var(--radius-md)', background: 'var(--color-white)' }}>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-surface-500)', marginBottom: '4px' }}>Owner</div>
                  <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{owner.name}</div>
                  {owner.phone && <div className="text-sm" style={{ color: 'var(--color-surface-500)' }}>{owner.phone}</div>}
                </div>
                {owner.phone && (
                  <a href={`tel:${owner.phone}`} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    Call
                  </a>
                )}
              </div>
            )}

            {emergency_contacts.map((c, i) => (
              <div key={i} className="flex items-center gap-3" style={{ padding: '16px', border: '1px solid var(--color-surface-200)', borderRadius: 'var(--radius-md)', background: 'var(--color-white)' }}>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-surface-500)', marginBottom: '4px' }}>{c.relationship || 'Emergency Contact'}</div>
                  <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{c.name}</div>
                  <div className="text-sm" style={{ color: 'var(--color-surface-500)' }}>{c.phone}</div>
                </div>
                <a href={`tel:${c.phone}`} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  Call
                </a>
              </div>
            ))}

            {/* Veterinarians */}
            {veterinarians.map((v, i) => (
              <div key={i} className="flex items-center gap-3" style={{ padding: '16px', border: '1px solid var(--color-surface-200)', borderRadius: 'var(--radius-md)', background: 'var(--color-white)' }}>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-surface-500)', marginBottom: '4px' }}>
                    Veterinarian{v.is_primary ? ' (Primary)' : ''}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{v.clinic_name}</div>
                  {v.vet_name && <div className="text-sm" style={{ color: 'var(--color-surface-500)' }}>Dr. {v.vet_name}</div>}
                  {v.phone && <div className="text-sm" style={{ color: 'var(--color-surface-500)' }}>{v.phone}</div>}
                </div>
                {v.phone && (
                  <a href={`tel:${v.phone}`} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    Call
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-surface-200)', textAlign: 'center' as const, padding: '16px', fontSize: '0.8125rem', color: 'var(--color-surface-500)' }}>
        Last updated {new Date(card.generated_at).toLocaleDateString()} &bull; Powered by{' '}
        <Link to="/" style={{ color: 'var(--color-navy)', fontWeight: 500, textDecoration: 'none' }}>FureverCare</Link>
      </footer>
    </div>
  );
}
