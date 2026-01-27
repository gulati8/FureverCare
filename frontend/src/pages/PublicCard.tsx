import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicApi, EmergencyCard } from '../api/client';

const KG_TO_LBS = 2.20462;

function formatWeight(value: number | string, unit: 'lbs' | 'kg' | null): React.ReactNode {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const safeUnit = unit || 'kg';
  if (safeUnit === 'lbs') {
    const kg = numValue / KG_TO_LBS;
    return <><strong>{numValue.toFixed(1)} lbs</strong> / {kg.toFixed(1)} kg</>;
  } else {
    const lbs = numValue * KG_TO_LBS;
    return <>{lbs.toFixed(1)} lbs / <strong>{numValue.toFixed(1)} kg</strong></>;
  }
}

export default function PublicCard() {
  const { shareId } = useParams<{ shareId: string }>();
  const [card, setCard] = useState<EmergencyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCard();
  }, [shareId]);

  const loadCard = async () => {
    if (!shareId) return;
    try {
      const data = await publicApi.getEmergencyCard(shareId);
      setCard(data);
    } catch (err) {
      setError('This emergency card could not be found or may have been removed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="mx-auto w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
          </svg>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Card Not Found</h1>
          <p className="mt-2 text-gray-500">{error}</p>
          <Link to="/" className="mt-4 inline-block btn-primary">
            Go to FureverCare
          </Link>
        </div>
      </div>
    );
  }

  const { pet, owner, conditions, allergies, medications, vaccinations, veterinarians, emergency_contacts } = card;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Emergency Header */}
      <div className="bg-red-600 text-white py-3 px-4 text-center">
        <p className="font-semibold">EMERGENCY PET HEALTH CARD</p>
        <p className="text-sm opacity-90">For veterinary staff use</p>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Pet Info Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-primary-600 text-white p-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span className="text-4xl">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{pet.name}</h1>
                <p className="opacity-90 capitalize">
                  {pet.breed ? `${pet.breed} ${pet.species}` : pet.species}
                  {pet.sex && ` • ${pet.sex}${pet.is_fixed ? ' (Fixed)' : ''}`}
                </p>
                {pet.age && <p className="text-sm opacity-75">Age: {pet.age}</p>}
              </div>
            </div>
          </div>

          <div className="p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {pet.weight_kg && (
                <div>
                  <dt className="text-gray-500">Weight</dt>
                  <dd className="font-medium">{formatWeight(pet.weight_kg, pet.weight_unit)}</dd>
                </div>
              )}
              {pet.microchip_id && (
                <div>
                  <dt className="text-gray-500">Microchip</dt>
                  <dd className="font-medium font-mono">{pet.microchip_id}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Critical Alert - Allergies */}
        {allergies.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              ALLERGIES
            </h2>
            <ul className="mt-2 space-y-1">
              {allergies.map((a, i) => (
                <li key={i} className="text-red-700">
                  <span className="font-semibold">{a.allergen}</span>
                  {a.severity && <span className="text-sm capitalize"> ({a.severity})</span>}
                  {a.reaction && <span className="text-sm"> - {a.reaction}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Medical Conditions */}
        {conditions.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h2 className="font-bold text-orange-800">Medical Conditions</h2>
            <ul className="mt-2 space-y-1">
              {conditions.map((c, i) => (
                <li key={i} className="text-orange-700">
                  <span className="font-medium">{c.name}</span>
                  {c.severity && <span className="text-sm capitalize"> ({c.severity})</span>}
                  {c.notes && <span className="text-sm"> - {c.notes}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Current Medications */}
        {medications.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h2 className="font-bold text-blue-800">Current Medications</h2>
            <ul className="mt-2 space-y-2">
              {medications.map((m, i) => (
                <li key={i} className="text-blue-700">
                  <span className="font-medium">{m.name}</span>
                  {m.dosage && <span className="text-sm"> - {m.dosage}</span>}
                  {m.frequency && <span className="text-sm"> ({m.frequency})</span>}
                  {m.notes && <p className="text-sm text-blue-600">{m.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Special Instructions */}
        {pet.special_instructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h2 className="font-bold text-yellow-800">Special Instructions</h2>
            <p className="mt-2 text-yellow-700">{pet.special_instructions}</p>
          </div>
        )}

        {/* Vaccinations */}
        {vaccinations.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold text-gray-800">Vaccination Record</h2>
            <ul className="mt-2 divide-y">
              {vaccinations.map((v, i) => {
                const isExpired = v.expiration_date && new Date(v.expiration_date) < new Date();
                return (
                  <li key={i} className="py-2 flex justify-between">
                    <span className="font-medium">{v.name}</span>
                    <span className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                      {v.expiration_date
                        ? `${isExpired ? 'Expired' : 'Expires'}: ${new Date(v.expiration_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`
                        : `Given: ${new Date(v.administered_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}`
                      }
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3">Contact Information</h2>

          {/* Owner */}
          {owner && (
            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-gray-500">Owner</p>
              <p className="font-semibold">{owner.name}</p>
              {owner.phone && (
                <a href={`tel:${owner.phone}`} className="text-primary-600 hover:underline block">
                  {owner.phone}
                </a>
              )}
              {owner.email && <p className="text-sm text-gray-600">{owner.email}</p>}
            </div>
          )}

          {/* Emergency Contacts */}
          {emergency_contacts.length > 0 && (
            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-gray-500 mb-2">Emergency Contacts</p>
              {emergency_contacts.map((c, i) => (
                <div key={i} className={i > 0 ? 'mt-2' : ''}>
                  <p className="font-medium">
                    {c.name}
                    {c.relationship && <span className="text-sm text-gray-500"> ({c.relationship})</span>}
                  </p>
                  <a href={`tel:${c.phone}`} className="text-primary-600 hover:underline">
                    {c.phone}
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Veterinarians */}
          {veterinarians.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Veterinarian{veterinarians.length > 1 ? 's' : ''}</p>
              {veterinarians.map((v, i) => (
                <div key={i} className={i > 0 ? 'mt-2' : ''}>
                  <p className="font-medium">
                    {v.clinic_name}
                    {v.is_primary && <span className="text-xs bg-primary-100 text-primary-700 ml-2 px-2 py-0.5 rounded">Primary</span>}
                  </p>
                  {v.vet_name && <p className="text-sm text-gray-600">Dr. {v.vet_name}</p>}
                  {v.phone && (
                    <a href={`tel:${v.phone}`} className="text-primary-600 hover:underline">
                      {v.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 py-4">
          <p>Generated {new Date(card.generated_at).toLocaleString()}</p>
          <p className="mt-1">
            Powered by{' '}
            <Link to="/" className="text-primary-600 hover:underline">
              FureverCare
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
