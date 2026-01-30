import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, EmergencyCard, ShareTokenInfo, API_URL } from '../api/client';

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

export default function TokenCard() {
  const { token } = useParams<{ token: string }>();
  const [tokenInfo, setTokenInfo] = useState<ShareTokenInfo | null>(null);
  const [card, setCard] = useState<EmergencyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [isPinError, setIsPinError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (token) {
      loadTokenInfo();
    }
  }, [token]);

  const loadTokenInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await publicApi.getTokenInfo(token!);
      setTokenInfo(info);

      // If no PIN required, load card immediately
      if (!info.requires_pin) {
        await loadCard();
      }
    } catch (err: any) {
      if (err.message.includes('expired') || err.message.includes('deactivated')) {
        setError('This share link has expired or been deactivated.');
      } else if (err.message.includes('not found')) {
        setError('Share link not found. It may have been deleted.');
      } else {
        setError('Failed to load share link information.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCard = async (pinCode?: string) => {
    setIsVerifying(true);
    setIsPinError(false);
    try {
      const cardData = await publicApi.accessWithToken(token!, pinCode);
      setCard(cardData);
    } catch (err: any) {
      if (err.message.includes('Invalid PIN')) {
        setIsPinError(true);
        setPin('');
      } else if (err.message.includes('PIN required')) {
        // Expected when PIN is needed
      } else {
        setError('Failed to access emergency card.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      loadCard(pin);
    }
  };

  const getFullPhotoUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // PIN entry form
  if (tokenInfo?.requires_pin && !card) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">PIN Required</h1>
            <p className="text-gray-600">
              {tokenInfo.label ? `Access to "${tokenInfo.label}"` : 'This share link'} requires a PIN.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter PIN"
                className={`input text-center text-lg tracking-widest ${isPinError ? 'border-red-500' : ''}`}
                autoFocus
                minLength={4}
                maxLength={20}
              />
              {isPinError && (
                <p className="text-red-600 text-sm mt-1 text-center">Invalid PIN. Please try again.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={pin.length < 4 || isVerifying}
              className="btn-primary w-full"
            >
              {isVerifying ? 'Verifying...' : 'Access Card'}
            </button>
          </form>

          {tokenInfo.expires_at && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Link expires: {new Date(tokenInfo.expires_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Display emergency card (same as PublicCard)
  if (!card) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Header */}
      <div className="bg-red-600 text-white py-4 px-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold">PET EMERGENCY CARD</h1>
              <p className="text-red-200 text-sm">FureverCare</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Pet Info */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {card.pet.photo_url ? (
                <img
                  src={getFullPhotoUrl(card.pet.photo_url)!}
                  alt={card.pet.name}
                  className="w-20 h-20 object-cover"
                />
              ) : (
                <span className="text-4xl">
                  {card.pet.species === 'dog' ? '🐕' : card.pet.species === 'cat' ? '🐈' : '🐾'}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{card.pet.name}</h2>
              <p className="text-gray-600 capitalize">
                {card.pet.breed ? `${card.pet.breed} ${card.pet.species}` : card.pet.species}
                {card.pet.age && ` • ${card.pet.age} old`}
              </p>
              <div className="flex gap-2 mt-1 text-sm text-gray-500">
                {card.pet.sex && <span className="capitalize">{card.pet.sex}{card.pet.is_fixed ? ' (Fixed)' : ''}</span>}
                {card.pet.weight_kg && <span>• {formatWeight(card.pet.weight_kg, card.pet.weight_unit)}</span>}
              </div>
            </div>
          </div>

          {card.pet.microchip_id && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-sm text-gray-500">Microchip:</span>
              <span className="ml-2 font-mono text-gray-900">{card.pet.microchip_id}</span>
            </div>
          )}
        </div>

        {/* Special Instructions */}
        {card.pet.special_instructions && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
            <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Special Instructions
            </h3>
            <p className="text-yellow-900">{card.pet.special_instructions}</p>
          </div>
        )}

        {/* Allergies */}
        {card.allergies.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <h3 className="font-bold text-red-800 mb-3">ALLERGIES</h3>
            <div className="space-y-2">
              {card.allergies.map((a, i) => (
                <div key={i} className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-red-900">{a.allergen}</span>
                    {a.severity && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        a.severity === 'life-threatening' ? 'bg-red-600 text-white' :
                        a.severity === 'severe' ? 'bg-red-400 text-white' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {a.severity}
                      </span>
                    )}
                  </div>
                  {a.reaction && <p className="text-sm text-red-700 mt-1">Reaction: {a.reaction}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medical Conditions */}
        {card.conditions.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <h3 className="font-bold text-orange-800 mb-3">MEDICAL CONDITIONS</h3>
            <div className="space-y-2">
              {card.conditions.map((c, i) => (
                <div key={i} className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-orange-900">{c.name}</span>
                    {c.severity && (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                        {c.severity}
                      </span>
                    )}
                  </div>
                  {c.notes && <p className="text-sm text-orange-700 mt-1">{c.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Medications */}
        {card.medications.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <h3 className="font-bold text-blue-800 mb-3">CURRENT MEDICATIONS</h3>
            <div className="space-y-2">
              {card.medications.map((m, i) => (
                <div key={i} className="bg-white rounded-lg p-3">
                  <span className="font-semibold text-blue-900">{m.name}</span>
                  {(m.dosage || m.frequency) && (
                    <p className="text-sm text-blue-700">
                      {m.dosage}{m.dosage && m.frequency && ' - '}{m.frequency}
                    </p>
                  )}
                  {m.notes && <p className="text-xs text-blue-600 mt-1">{m.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner Contact */}
        {card.owner && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">OWNER CONTACT</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{card.owner.name}</p>
                {card.owner.phone && (
                  <a href={`tel:${card.owner.phone}`} className="text-primary-600 text-lg font-semibold">
                    {card.owner.phone}
                  </a>
                )}
              </div>
              {card.owner.phone && (
                <a href={`tel:${card.owner.phone}`} className="bg-green-500 text-white p-3 rounded-full">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        {card.emergency_contacts.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">EMERGENCY CONTACTS</h3>
            <div className="space-y-3">
              {card.emergency_contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium">{c.name}</p>
                    {c.relationship && <p className="text-sm text-gray-500">{c.relationship}</p>}
                  </div>
                  <a href={`tel:${c.phone}`} className="text-primary-600 font-semibold">
                    {c.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Veterinarians */}
        {card.veterinarians.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">VETERINARIANS</h3>
            <div className="space-y-3">
              {card.veterinarians.map((v, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium">{v.clinic_name}</p>
                    {v.vet_name && <p className="text-sm text-gray-500">Dr. {v.vet_name}</p>}
                  </div>
                  {v.phone && (
                    <a href={`tel:${v.phone}`} className="text-primary-600 font-semibold">
                      {v.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vaccinations */}
        {card.vaccinations.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">VACCINATIONS</h3>
            <div className="space-y-2">
              {card.vaccinations.map((v, i) => {
                const isExpired = v.expiration_date && new Date(v.expiration_date) < new Date();
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="font-medium">{v.name}</span>
                    <span className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                      {v.expiration_date
                        ? `${isExpired ? 'Expired' : 'Exp'}: ${new Date(v.expiration_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`
                        : new Date(v.administered_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-gray-400 text-xs">
          <p>Generated {new Date(card.generated_at).toLocaleString()}</p>
          <p className="mt-1">Powered by FureverCare</p>
        </div>
      </div>
    </div>
  );
}
