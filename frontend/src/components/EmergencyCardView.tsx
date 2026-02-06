import { useState } from 'react';
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
  type: 'allergy' | 'medication' | 'condition';
  title: string;
  detail: string;
}

function buildAlerts(card: EmergencyCard): AlertItem[] {
  const alerts: AlertItem[] = [];

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
    if (m.notes) {
      alerts.push({
        type: 'medication',
        title: `On ${m.name} - ${m.notes}`,
        detail: [m.dosage, m.frequency].filter(Boolean).join(' '),
      });
    }
  }

  for (const c of card.conditions) {
    if (c.severity === 'life-threatening' || c.severity === 'severe' || c.severity === 'critical') {
      alerts.push({
        type: 'condition',
        title: c.name,
        detail: c.notes || 'Monitor during procedures',
      });
    }
  }

  return alerts;
}

function severityToIndicator(severity: string | null): 'critical' | 'high' | 'medium' | 'low' {
  switch (severity) {
    case 'life-threatening': return 'critical';
    case 'severe': case 'critical': return 'high';
    case 'moderate': return 'medium';
    default: return 'low';
  }
}

const indicatorColors = {
  critical: 'bg-red-600',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-300',
};

const severityChipStyles: Record<string, string> = {
  'life-threatening': 'bg-red-600 text-white',
  'severe': 'bg-orange-500 text-white',
  'moderate': 'bg-yellow-100 text-yellow-800',
  'mild': 'bg-gray-100 text-gray-600',
};

interface Props {
  card: EmergencyCard;
  resolvePhotoUrl?: (url: string | null) => string | null;
}

export default function EmergencyCardView({ card, resolvePhotoUrl }: Props) {
  const [vaccsExpanded, setVaccsExpanded] = useState(false);
  const { pet, owner, conditions, allergies, medications, vaccinations, veterinarians, emergency_contacts } = card;
  const alerts = buildAlerts(card);
  const hasAlerts = alerts.length > 0;

  const photoUrl = resolvePhotoUrl ? resolvePhotoUrl(pet.photo_url) : pet.photo_url;

  const speciesEmoji = pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sticky Header */}
      <header className="bg-red-600 text-white py-3.5 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">EMERGENCY PET CARD</h1>
            <p className="text-[11px] text-red-200">FureverCare</p>
          </div>
        </div>
      </header>

      {/* Smart Summary */}
      {hasAlerts ? (
        <div className="bg-gradient-to-br from-red-900 to-red-600 text-white px-4 py-5">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                <span className="w-5 h-5 bg-white text-red-600 rounded-full flex items-center justify-center text-[11px] font-bold">
                  {alerts.length}
                </span>
                ALERTS FOR {pet.name.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2.5">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-white/10 border border-white/20 rounded-lg p-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 bg-white ${
                    alert.type === 'allergy' ? 'text-red-600' :
                    alert.type === 'medication' ? 'text-blue-600' :
                    'text-orange-500'
                  }`}>
                    {alert.type === 'allergy' ? '⚠' :
                     alert.type === 'medication' ? 'Rx' : '♥'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{alert.title}</p>
                    <p className="text-xs opacity-90 mt-0.5">{alert.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-600 text-white px-4 py-6 text-center">
          <div className="max-w-lg mx-auto">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
              ✓
            </div>
            <p className="text-sm font-semibold">No known allergies or critical conditions</p>
            <p className="text-xs opacity-90 mt-1">
              {pet.name} • {pet.breed ? `${pet.breed}` : pet.species}
              {pet.weight_kg ? ` • ${primaryWeight(pet.weight_kg, pet.weight_unit)}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Pet Quick Info Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt={pet.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <span>{speciesEmoji}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{pet.name}</h2>
            <p className="text-xs text-gray-500">
              {pet.breed && <span className="capitalize">{pet.breed}</span>}
              {pet.breed && pet.sex && ' | '}
              {pet.sex && <span className="capitalize">{pet.sex}{pet.is_fixed ? ', Fixed' : ''}</span>}
              {(pet.breed || pet.sex) && pet.age && ' | '}
              {pet.age && <span>{pet.age}</span>}
            </p>
            {pet.microchip_id && (
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">MC: {pet.microchip_id}</p>
            )}
          </div>
          {pet.weight_kg && (
            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-center flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wide font-medium">Weight</p>
              <p className="text-base font-bold leading-tight">{primaryWeight(pet.weight_kg, pet.weight_unit)}</p>
              <p className="text-[10px] text-blue-500">{formatWeight(pet.weight_kg, pet.weight_unit)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">

        {/* Special Instructions */}
        {pet.special_instructions && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-yellow-800 flex items-center gap-2 mb-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Special Instructions
            </h3>
            <p className="text-sm text-yellow-900">{pet.special_instructions}</p>
          </div>
        )}

        {/* Allergies */}
        {allergies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Allergies
              </h3>
              <span className="text-[11px] text-gray-500">{allergies.length} item{allergies.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {allergies.map((a, i) => {
                const level = severityToIndicator(a.severity);
                return (
                  <div key={i} className="bg-red-50 border border-red-200/50 rounded-xl p-3 flex items-start gap-2.5">
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${indicatorColors[level]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{a.allergen}</span>
                        {a.severity && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${severityChipStyles[a.severity] || 'bg-gray-100 text-gray-600'}`}>
                            {a.severity === 'life-threatening' ? 'Anaphylaxis' : a.severity}
                          </span>
                        )}
                      </div>
                      {a.reaction && <p className="text-xs text-gray-600 mt-1">{a.reaction}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Current Medications */}
        {medications.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-blue-700 flex items-center gap-2">
                <span className="text-sm font-bold">Rx</span>
                Current Medications
              </h3>
              <span className="text-[11px] text-gray-500">{medications.length} item{medications.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {medications.map((m, i) => {
                const hasWarning = !!m.notes;
                return (
                  <div key={i} className="bg-blue-50 border border-blue-200/50 rounded-xl p-3 flex items-start gap-2.5">
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${hasWarning ? 'bg-orange-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                      {(m.dosage || m.frequency) && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {m.dosage}{m.dosage && m.frequency && ' - '}{m.frequency}
                        </p>
                      )}
                      {m.notes && (
                        <p className="text-[11px] font-semibold text-yellow-700 mt-1.5 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {m.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Medical Conditions */}
        {conditions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-orange-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Medical Conditions
              </h3>
              <span className="text-[11px] text-gray-500">{conditions.length} item{conditions.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {conditions.map((c, i) => {
                const level = severityToIndicator(c.severity);
                const isLow = level === 'low';
                return (
                  <div key={i} className={`${isLow ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-200/50'} border rounded-xl p-3 flex items-start gap-2.5`}>
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${indicatorColors[level]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                        {c.severity && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${severityChipStyles[c.severity] || 'bg-gray-100 text-gray-600'}`}>
                            {c.severity}
                          </span>
                        )}
                      </div>
                      {c.notes && <p className="text-xs text-gray-600 mt-1">{c.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Emergency Contacts */}
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-gray-700 flex items-center gap-2 mb-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Emergency Contacts
          </h3>
          <div className="space-y-2">
            {/* Owner */}
            {owner && (
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">{owner.name}</p>
                  <p className="text-[11px] text-gray-500">Owner</p>
                </div>
                {owner.phone && (
                  <a
                    href={`tel:${owner.phone}`}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call
                  </a>
                )}
              </div>
            )}

            {/* Emergency Contacts */}
            {emergency_contacts.map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">{c.name}</p>
                  <p className="text-[11px] text-gray-500">{c.relationship || 'Emergency Contact'}</p>
                </div>
                <a
                  href={`tel:${c.phone}`}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call
                </a>
              </div>
            ))}

            {/* Veterinarians */}
            {veterinarians.map((v, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">
                    {v.clinic_name}
                    {v.is_primary && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 ml-1.5 px-1.5 py-0.5 rounded font-bold uppercase">Primary</span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {v.vet_name ? `Dr. ${v.vet_name}` : 'Veterinarian'}
                  </p>
                </div>
                {v.phone && (
                  <a
                    href={`tel:${v.phone}`}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Vaccinations (Expandable) */}
        {vaccinations.length > 0 && (
          <section>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setVaccsExpanded(!vaccsExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-xs font-semibold text-gray-700">
                  Vaccination Records ({vaccinations.length})
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${vaccsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {vaccsExpanded && (
                <div className="px-4 py-2 border-t border-gray-200">
                  {vaccinations.map((v, i) => {
                    const isExpired = v.expiration_date && new Date(v.expiration_date) < new Date();
                    return (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-900">{v.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isExpired
                            ? 'bg-red-50 text-red-600'
                            : 'bg-green-50 text-green-600'
                        }`}>
                          {v.expiration_date
                            ? `${isExpired ? 'Expired' : 'Current'} - ${isExpired ? '' : 'Exp '}${new Date(v.expiration_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`
                            : `Given ${new Date(v.administered_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 text-center py-5 px-4">
        <p className="text-[11px] text-gray-400">
          Generated {new Date(card.generated_at).toLocaleString()}
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          Powered by{' '}
          <Link to="/" className="text-blue-600 hover:underline">FureverCare</Link>
        </p>
      </footer>
    </div>
  );
}
