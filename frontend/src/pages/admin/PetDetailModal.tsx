import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { adminApi, AdminPetDetails } from '../../api/admin';

interface Props {
  petId: number;
  onClose: () => void;
}

export default function PetDetailModal({ petId, onClose }: Props) {
  const { token } = useAuth();
  const [pet, setPet] = useState<AdminPetDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPet = async () => {
      if (!token) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await adminApi.fetchPetById(petId, token);
        setPet(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pet');
      } finally {
        setIsLoading(false);
      }
    };

    loadPet();
  }, [petId, token]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleViewPublicCard = () => {
    if (pet?.share_id) {
      window.open(`/card/${pet.share_id}`, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-navy">Pet Details</h2>
              {pet && (
                <p className="text-sm text-surface-500 mt-1">ID: {pet.id}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-surface-400 hover:text-surface-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-danger-light border border-danger-light text-danger px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : pet ? (
            <div className="space-y-6">
              {/* Pet Info */}
              <div className="bg-surface rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {pet.photo_url ? (
                      <img
                        src={pet.photo_url}
                        alt={pet.name}
                        className="w-20 h-20 object-cover"
                      />
                    ) : (
                      <span className="text-3xl">
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy">{pet.name}</h3>
                    <p className="text-surface-600 capitalize">
                      {pet.breed ? `${pet.breed} ${pet.species}` : pet.species}
                    </p>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {pet.date_of_birth && (
                        <div>
                          <span className="text-surface-500">DOB:</span>
                          <span className="ml-1 text-navy">
                            {new Date(pet.date_of_birth.split('T')[0] + 'T00:00:00').toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {pet.sex && (
                        <div>
                          <span className="text-surface-500">Sex:</span>
                          <span className="ml-1 text-navy capitalize">{pet.sex}</span>
                        </div>
                      )}
                      {pet.weight && (
                        <div>
                          <span className="text-surface-500">Weight:</span>
                          <span className="ml-1 text-navy">{pet.weight} lbs</span>
                        </div>
                      )}
                      {pet.microchip_number && (
                        <div>
                          <span className="text-surface-500">Microchip:</span>
                          <span className="ml-1 text-navy font-mono text-xs">{pet.microchip_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              <div className="bg-surface rounded-lg p-4">
                <h3 className="text-lg font-semibold text-navy mb-3">Primary Owner</h3>
                <div className="bg-white rounded-lg p-3">
                  <p className="font-medium text-navy">{pet.owner_name}</p>
                  <p className="text-sm text-surface-600">{pet.owner_email}</p>
                  <p className="text-xs text-surface-500 mt-1">User ID: {pet.owner_id}</p>
                </div>
              </div>

              {/* Shared Access */}
              {pet.owners && pet.owners.length > 1 && (
                <div className="bg-surface rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-navy mb-3">
                    Shared Access ({pet.owners.length - 1})
                  </h3>
                  <div className="space-y-2">
                    {pet.owners
                      .filter((owner) => owner.role !== 'owner')
                      .map((owner) => (
                        <div key={owner.user_id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-navy">{owner.name}</p>
                            <p className="text-xs text-surface-600">{owner.email}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              owner.role === 'editor'
                                ? 'bg-info-light text-info'
                                : 'bg-surface-100 text-navy'
                            }`}>
                              {owner.role}
                            </span>
                            {!owner.accepted_at && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-light text-warning-dark">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Health Records Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-info-light rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-navy">{pet.vet_count}</p>
                  <p className="text-sm text-info">Vets</p>
                </div>
                <div className="bg-surface-100 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-navy">{pet.condition_count}</p>
                  <p className="text-sm text-surface-700">Conditions</p>
                </div>
                <div className="bg-danger-light rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-navy">{pet.allergy_count}</p>
                  <p className="text-sm text-danger">Allergies</p>
                </div>
                <div className="bg-success-light rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-navy">{pet.medication_count}</p>
                  <p className="text-sm text-success">Medications</p>
                </div>
                <div className="bg-warning-light rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-navy">{pet.vaccination_count}</p>
                  <p className="text-sm text-warning-dark">Vaccinations</p>
                </div>
              </div>

              {/* Vets */}
              {pet.vets && pet.vets.length > 0 && (
                <div className="bg-surface rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-navy mb-3">Vets ({pet.vets.length})</h3>
                  <div className="space-y-2">
                    {pet.vets.map((vet) => (
                      <div key={vet.id} className="bg-white rounded-lg p-3">
                        <p className="font-medium text-navy">{vet.name}</p>
                        {vet.clinic_name && <p className="text-sm text-surface-600">{vet.clinic_name}</p>}
                        <div className="mt-1 text-xs text-surface-500 space-x-3">
                          {vet.phone && <span>{vet.phone}</span>}
                          {vet.email && <span>{vet.email}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditions */}
              {pet.conditions && pet.conditions.length > 0 && (
                <div className="bg-surface rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-navy mb-3">Conditions ({pet.conditions.length})</h3>
                  <div className="space-y-2">
                    {pet.conditions.map((condition) => (
                      <div key={condition.id} className="bg-white rounded-lg p-3">
                        <p className="font-medium text-navy">{condition.name}</p>
                        {condition.diagnosed_date && (
                          <p className="text-xs text-surface-500">
                            Diagnosed: {new Date(condition.diagnosed_date).toLocaleDateString()}
                          </p>
                        )}
                        {condition.notes && <p className="text-sm text-surface-600 mt-1">{condition.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergies */}
              {pet.allergies && pet.allergies.length > 0 && (
                <div className="bg-surface rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-navy mb-3">Allergies ({pet.allergies.length})</h3>
                  <div className="space-y-2">
                    {pet.allergies.map((allergy) => (
                      <div key={allergy.id} className="bg-white rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-navy">{allergy.allergen}</p>
                            {allergy.reaction && <p className="text-sm text-surface-600">{allergy.reaction}</p>}
                          </div>
                          {allergy.severity && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              allergy.severity === 'severe'
                                ? 'bg-danger-light text-danger'
                                : allergy.severity === 'moderate'
                                ? 'bg-warning-light text-warning-dark'
                                : 'bg-success-light text-success'
                            }`}>
                              {allergy.severity}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {pet.medications && pet.medications.length > 0 && (
                <div className="bg-surface rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-navy mb-3">Medications ({pet.medications.length})</h3>
                  <div className="space-y-2">
                    {pet.medications.map((medication) => (
                      <div key={medication.id} className="bg-white rounded-lg p-3">
                        <p className="font-medium text-navy">{medication.name}</p>
                        <div className="mt-1 text-sm text-surface-600 space-x-3">
                          {medication.dosage && <span>Dosage: {medication.dosage}</span>}
                          {medication.frequency && <span>Frequency: {medication.frequency}</span>}
                        </div>
                        {medication.start_date && (
                          <p className="text-xs text-surface-500 mt-1">
                            Started: {new Date(medication.start_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vaccinations */}
              {pet.vaccinations && pet.vaccinations.length > 0 && (
                <div className="bg-surface rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-navy mb-3">Vaccinations ({pet.vaccinations.length})</h3>
                  <div className="space-y-2">
                    {pet.vaccinations.map((vaccination) => (
                      <div key={vaccination.id} className="bg-white rounded-lg p-3">
                        <p className="font-medium text-navy">{vaccination.name}</p>
                        <div className="mt-1 text-xs text-surface-500 space-x-3">
                          {vaccination.date_administered && (
                            <span>Administered: {new Date(vaccination.date_administered).toLocaleDateString()}</span>
                          )}
                          {vaccination.next_due_date && (
                            <span>Next Due: {new Date(vaccination.next_due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Info */}
              {pet.share_id && (
                <div className="bg-primary-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-navy mb-3">Emergency Card</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-surface-700">
                        Emergency card is {pet.is_emergency_card_enabled ? 'enabled' : 'disabled'}
                      </p>
                      <p className="text-xs text-surface-500 font-mono mt-1">Share ID: {pet.share_id}</p>
                    </div>
                    {pet.is_emergency_card_enabled && (
                      <button
                        onClick={handleViewPublicCard}
                        className="btn-primary"
                      >
                        View Public Card
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-surface-500 pt-4 border-t border-surface-200">
                <p>Created: {new Date(pet.created_at).toLocaleString()}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
