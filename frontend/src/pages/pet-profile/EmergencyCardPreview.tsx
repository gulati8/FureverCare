import { PetCondition, PetAllergy, PetMedication, PetVaccination, PetAlert, PetEmergencyContact } from '../../api/client';

interface AlertItem {
  type: 'allergy' | 'medication' | 'condition' | 'vaccination' | 'custom';
  title: string;
  detail: string;
}

function buildPreviewAlerts(
  conditions: PetCondition[],
  allergies: PetAllergy[],
  medications: PetMedication[],
  vaccinations: PetVaccination[],
  alerts: PetAlert[],
): AlertItem[] {
  const items: AlertItem[] = [];

  for (const a of alerts.filter(a => a.is_active)) {
    items.push({ type: 'custom', title: a.alert_text, detail: 'Owner alert' });
  }

  for (const a of allergies.filter(a => a.show_on_card)) {
    const severity = a.severity === 'life-threatening' ? ' (ANAPHYLAXIS RISK)' :
      a.severity === 'severe' ? ' (SEVERE)' : '';
    items.push({
      type: 'allergy',
      title: `${a.allergen} Allergy${severity}`,
      detail: a.reaction ? `Reaction: ${a.reaction}` : 'Avoid this allergen',
    });
  }

  for (const m of medications.filter(m => m.show_on_card && m.is_active)) {
    items.push({
      type: 'medication',
      title: `On ${m.name}`,
      detail: [m.dosage, m.frequency].filter(Boolean).join(' '),
    });
  }

  for (const c of conditions.filter(c => c.show_on_card && c.is_active)) {
    items.push({
      type: 'condition',
      title: c.name,
      detail: c.notes || 'Monitor during procedures',
    });
  }

  for (const v of vaccinations.filter(v => v.show_on_card)) {
    const isExpired = v.expiration_date && new Date(v.expiration_date) < new Date();
    items.push({
      type: 'vaccination',
      title: `${v.name}${isExpired ? ' (EXPIRED)' : ''}`,
      detail: v.expiration_date
        ? `${isExpired ? 'Expired' : 'Expires'}: ${new Date(v.expiration_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`
        : `Given ${new Date(v.administered_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`,
    });
  }

  return items;
}

const alertTypeColors: Record<string, { bg: string; text: string; icon: string }> = {
  allergy: { bg: 'var(--color-danger-light)', text: 'var(--color-danger)', icon: '\u26A0' },
  medication: { bg: 'var(--color-info-light)', text: 'var(--color-info)', icon: '\u{1F48A}' },
  condition: { bg: 'var(--color-warning-light)', text: '#8B6914', icon: '\u2665' },
  vaccination: { bg: 'var(--color-success-light)', text: '#1E8449', icon: '\u{1F489}' },
  custom: { bg: 'var(--color-danger-light)', text: 'var(--color-danger)', icon: '\u26A0' },
};

export default function EmergencyCardPreview({
  petName,
  conditions,
  allergies,
  medications,
  vaccinations,
  alerts,
  contacts,
  onShare,
  onConfigure,
}: {
  petName: string;
  conditions: PetCondition[];
  allergies: PetAllergy[];
  medications: PetMedication[];
  vaccinations: PetVaccination[];
  alerts: PetAlert[];
  contacts: PetEmergencyContact[];
  onShare: () => void;
  onConfigure: () => void;
}) {
  const previewAlerts = buildPreviewAlerts(conditions, allergies, medications, vaccinations, alerts);
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];

  return (
    <div className="emergency-card-preview">
      {/* Red header */}
      <div className="emergency-card-preview-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6z"/>
          <rect x="11" y="10" width="2" height="4"/>
          <rect x="11" y="16" width="2" height="2"/>
        </svg>
        <span>EMERGENCY PET CARD</span>
      </div>

      {/* Alert items */}
      <div className="emergency-card-preview-body">
        {previewAlerts.length === 0 ? (
          <p style={{ color: 'var(--color-surface-500)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px 0' }}>
            No alerts configured yet. Use the bell icon on health records to add items to the emergency card.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {previewAlerts.slice(0, 4).map((alert, i) => {
              const colors = alertTypeColors[alert.type];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                  background: colors.bg, fontSize: '0.8125rem',
                }}>
                  <span>{colors.icon}</span>
                  <span style={{ color: colors.text, fontWeight: 600 }}>{alert.title}</span>
                </div>
              );
            })}
            {previewAlerts.length > 4 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-surface-500)', textAlign: 'center' }}>
                +{previewAlerts.length - 4} more alerts
              </p>
            )}
          </div>
        )}

        {/* Primary contact */}
        {primaryContact && (
          <div style={{
            marginTop: '12px', paddingTop: '12px',
            borderTop: '1px solid var(--color-surface-200)',
            fontSize: '0.8125rem',
          }}>
            <span style={{ color: 'var(--color-surface-500)' }}>Emergency Contact: </span>
            <span style={{ fontWeight: 600 }}>{primaryContact.name}</span>
            <span style={{ color: 'var(--color-surface-500)' }}> {primaryContact.phone}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="emergency-card-preview-actions">
        <button onClick={onShare} className="btn btn-sm" style={{
          background: 'var(--color-danger)', color: 'white', flex: 1,
          padding: '8px 12px', fontSize: '0.8125rem',
        }}>
          Share Card
        </button>
        <button onClick={onConfigure} className="btn btn-sm btn-ghost" style={{
          fontSize: '0.8125rem', padding: '8px 12px',
          border: '1px solid var(--color-surface-200)',
        }}>
          Configure
        </button>
      </div>
    </div>
  );
}
