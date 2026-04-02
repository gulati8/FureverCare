import { PetCondition, PetAllergy, PetMedication, PetVaccination, PetAlert, PetEmergencyContact, PetVet } from '../../api/client';

const sectionColors: Record<string, { bg: string; text: string; label: string }> = {
  condition: { bg: 'var(--color-warning-light)', text: '#8B6914', label: 'Conditions' },
  allergy: { bg: 'var(--color-danger-light)', text: 'var(--color-danger)', label: 'Allergies' },
  medication: { bg: 'var(--color-info-light)', text: 'var(--color-info)', label: 'Medications' },
  vaccination: { bg: 'var(--color-success-light)', text: '#1E8449', label: 'Vaccinations' },
};

export default function EmergencyCardPreview({
  petName,
  conditions,
  allergies,
  medications,
  vaccinations,
  alerts,
  contacts,
  vets,
  specialInstructions,
  onShare,
  onEdit,
}: {
  petName: string;
  conditions: PetCondition[];
  allergies: PetAllergy[];
  medications: PetMedication[];
  vaccinations: PetVaccination[];
  alerts: PetAlert[];
  contacts: PetEmergencyContact[];
  vets: PetVet[];
  specialInstructions: string | null;
  onShare: () => void;
  onEdit: () => void;
}) {
  const activeConditions = conditions.filter(c => c.show_on_card && c.is_active);
  const activeAllergies = allergies.filter(a => a.show_on_card);
  const activeMedications = medications.filter(m => m.show_on_card && m.is_active);
  const activeVaccinations = vaccinations.filter(v => v.show_on_card);

  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
  const primaryVet = vets.find(v => v.is_primary) ?? null;

  const hasContent = activeConditions.length > 0 || activeAllergies.length > 0 || activeMedications.length > 0 || activeVaccinations.length > 0;

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

      {/* Card body */}
      <div className="emergency-card-preview-body">
        {!hasContent ? (
          <p style={{ color: 'var(--color-surface-500)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px 0' }}>
            No items on card yet. Use the bell icon on health records to add items to the emergency card.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Conditions */}
            {activeConditions.length > 0 && (
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8B6914', marginBottom: '4px' }}>
                  {sectionColors.condition.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {activeConditions.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                      background: sectionColors.condition.bg, fontSize: '0.8125rem',
                    }}>
                      <span style={{ color: sectionColors.condition.text, fontWeight: 600 }}>{c.name}</span>
                      {c.severity && <span style={{ color: sectionColors.condition.text, fontSize: '0.6875rem', opacity: 0.8 }}>({c.severity})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies */}
            {activeAllergies.length > 0 && (
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-danger)', marginBottom: '4px' }}>
                  {sectionColors.allergy.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {activeAllergies.map(a => {
                    const severity = a.severity === 'life-threatening' ? ' (ANAPHYLAXIS RISK)' :
                      a.severity === 'severe' ? ' (SEVERE)' : '';
                    return (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                        background: sectionColors.allergy.bg, fontSize: '0.8125rem',
                      }}>
                        <span style={{ color: sectionColors.allergy.text, fontWeight: 600 }}>{a.allergen}{severity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Medications */}
            {activeMedications.length > 0 && (
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-info)', marginBottom: '4px' }}>
                  {sectionColors.medication.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {activeMedications.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                      background: sectionColors.medication.bg, fontSize: '0.8125rem',
                    }}>
                      <span style={{ color: sectionColors.medication.text, fontWeight: 600 }}>{m.name}</span>
                      {(m.dosage || m.frequency) && (
                        <span style={{ color: sectionColors.medication.text, fontSize: '0.6875rem', opacity: 0.8 }}>
                          {[m.dosage, m.frequency].filter(Boolean).join(' ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vaccinations */}
            {activeVaccinations.length > 0 && (
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1E8449', marginBottom: '4px' }}>
                  {sectionColors.vaccination.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {activeVaccinations.map(v => {
                    const isExpired = v.expiration_date && new Date(v.expiration_date) < new Date();
                    return (
                      <div key={v.id} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                        background: sectionColors.vaccination.bg, fontSize: '0.8125rem',
                      }}>
                        <span style={{ color: sectionColors.vaccination.text, fontWeight: 600 }}>
                          {v.name}{isExpired ? ' (EXPIRED)' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Owner's Notes */}
        {specialInstructions && (
          <div style={{
            marginTop: '10px',
            background: '#FEFCE8',
            border: '1px solid #FEF08A',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
          }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400E', marginBottom: '4px' }}>
              Owner's Notes
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#78350F' }}>{specialInstructions}</p>
          </div>
        )}

        {/* Primary vet */}
        {primaryVet && (
          <div style={{
            marginTop: '12px', paddingTop: '12px',
            borderTop: '1px solid var(--color-surface-200)',
            fontSize: '0.8125rem',
          }}>
            <span style={{ color: 'var(--color-surface-500)' }}>Primary Vet: </span>
            <span style={{ fontWeight: 600 }}>{primaryVet.clinic_name}</span>
            {primaryVet.phone && (
              <span style={{ color: 'var(--color-surface-500)' }}> {primaryVet.phone}</span>
            )}
          </div>
        )}

        {/* Primary emergency contact */}
        {primaryContact && (
          <div style={{
            marginTop: '8px',
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
          Send Card
        </button>
        <button onClick={onEdit} className="btn btn-sm btn-ghost" style={{
          fontSize: '0.8125rem', padding: '8px 12px',
          border: '1px solid var(--color-surface-200)',
        }}>
          Edit
        </button>
      </div>
    </div>
  );
}
