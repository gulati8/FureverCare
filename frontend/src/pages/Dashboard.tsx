import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  petsApi,
  Pet,
  PetCondition,
  PetAllergy,
  PetMedication,
  PetVaccination,
  PetAlert,
} from '../api/client';
import { cmsApi } from '../api/cms';
import AddPetModal from '../components/AddPetModal';
import UpgradeBanner from '../components/UpgradeBanner';
import SpeciesAvatar from '../components/SpeciesAvatar';

// Pet limits by tier
const FREE_TIER_PET_LIMIT = Infinity; // Beta: unlimited pets for all users

interface PetHealthData {
  conditions: PetCondition[];
  allergies: PetAllergy[];
  medications: PetMedication[];
  vaccinations: PetVaccination[];
  alerts: PetAlert[];
}

interface ActionItem {
  petId: number;
  petName: string;
  type: 'danger' | 'warning';
  text: string;
}

export default function Dashboard() {
  const { token, isPremium } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [healthData, setHealthData] = useState<Record<number, PetHealthData>>({});
  const [emptyStateHeading, setEmptyStateHeading] = useState('Add your first pet to create their profile');
  const [emptyStateSubheading, setEmptyStateSubheading] = useState('');

  useEffect(() => {
    loadPets();
  }, [token]);

  const loadPets = async () => {
    if (!token) return;
    try {
      const data = await petsApi.list(token);
      setPets(data);
      // Fire parallel health fetches
      loadHealthData(data);
      // Fetch CMS empty state content when there are no pets
      if (data.length === 0) {
        try {
          const page = await cmsApi.fetchPage('dashboard-empty-state');
          const block = page.blocks.find(b => b.block_type === 'empty_state' && b.is_visible);
          if (block) {
            const content = block.content as { heading: string; subheading?: string };
            if (content.heading) setEmptyStateHeading(content.heading);
            if (content.subheading) setEmptyStateSubheading(content.subheading);
          }
        } catch {
          // Keep fallback text on CMS failure
        }
      }
    } catch (err) {
      console.error('Failed to load pets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHealthData = async (petList: Pet[]) => {
    if (!token) return;
    const results: Record<number, PetHealthData> = {};

    await Promise.all(petList.map(async (pet) => {
      try {
        const [conditions, allergies, medications, vaccinations, alerts] = await Promise.all([
          petsApi.getConditions(pet.id, token),
          petsApi.getAllergies(pet.id, token),
          petsApi.getMedications(pet.id, token),
          petsApi.getVaccinations(pet.id, token),
          petsApi.getAlerts(pet.id, token),
        ]);
        results[pet.id] = { conditions, allergies, medications, vaccinations, alerts };
        // Progressive update
        setHealthData(prev => ({ ...prev, [pet.id]: { conditions, allergies, medications, vaccinations, alerts } }));
      } catch {
        // Silently skip health data for pets that fail
      }
    }));
  };

  const handlePetAdded = (pet: Pet) => {
    setPets([pet, ...pets]);
    setShowAddModal(false);
  };

  const petLimit = isPremium ? Infinity : FREE_TIER_PET_LIMIT;
  const isAtPetLimit = pets.length >= petLimit;

  const handleAddPetClick = () => {
    if (isAtPetLimit) return;
    setShowAddModal(true);
  };

  const getPetCountText = () => {
    if (isPremium) {
      return `${pets.length} pet${pets.length !== 1 ? 's' : ''}`;
    }
    return `${pets.length}/${petLimit} pet${petLimit !== 1 ? 's' : ''}`;
  };

  // Build action items from health data
  const actionItems: ActionItem[] = [];
  for (const pet of pets) {
    const health = healthData[pet.id];
    if (!health) continue;

    const expiredVacs = health.vaccinations.filter(v =>
      v.expiration_date && new Date(v.expiration_date) < new Date()
    );
    for (const v of expiredVacs) {
      actionItems.push({
        petId: pet.id,
        petName: pet.name,
        type: 'danger',
        text: `${pet.name}: ${v.name} vaccination expired`,
      });
    }

    const cardConditions = health.conditions.filter(c => c.show_on_card && c.is_active);
    for (const c of cardConditions) {
      actionItems.push({
        petId: pet.id,
        petName: pet.name,
        type: 'warning',
        text: `${pet.name}: ${c.name} flagged on emergency card`,
      });
    }
  }

  const getVaccineStatus = (health: PetHealthData) => {
    const expired = health.vaccinations.filter(v =>
      v.expiration_date && new Date(v.expiration_date) < new Date()
    );
    if (expired.length > 0) return { label: 'Vaccine expired', type: 'danger' as const };
    if (health.vaccinations.length > 0) return { label: 'Vaccines current', type: 'success' as const };
    return null;
  };

  const getAlertCount = (health: PetHealthData) => {
    return health.alerts.filter(a => a.is_active).length +
      health.conditions.filter(c => c.show_on_card && c.is_active).length +
      health.allergies.filter(a => a.show_on_card).length +
      health.medications.filter(m => m.show_on_card && m.is_active).length +
      health.vaccinations.filter(v => v.show_on_card).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-navy)' }}></div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="current">Dashboard</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-2xl" style={{ color: 'var(--color-navy)', fontWeight: 700 }}>My Pets</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-surface-500)' }}>{getPetCountText()}</p>
        </div>
        <button
          onClick={handleAddPetClick}
          disabled={isAtPetLimit}
          className="btn btn-primary btn-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          Add Pet
        </button>
      </div>

      {/* Upgrade banner */}
      {isAtPetLimit && (
        <div className="mb-6">
          <UpgradeBanner type="pet_limit" petCount={pets.length} petLimit={petLimit} />
        </div>
      )}

      {pets.length === 0 ? (
        <div className="text-center py-12">
          <div
            className="mx-auto flex items-center justify-center mb-4"
            style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-navy-50)' }}
          >
            <SpeciesAvatar species="other" size={40} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-navy)' }}>{emptyStateHeading}</h3>
          <p className="mt-2" style={{ color: 'var(--color-surface-500)' }}>{emptyStateSubheading}</p>
          <button onClick={() => setShowAddModal(true)} className="mt-4 btn btn-primary">
            Add Your First Pet
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
            {pets.map((pet) => {
              const health = healthData[pet.id];
              const vaccineStatus = health ? getVaccineStatus(health) : null;
              const alertCount = health ? getAlertCount(health) : 0;
              const activeConditions = health ? health.conditions.filter(c => c.is_active).length : 0;

              return (
                <Link
                  key={pet.id}
                  to={`/pets/${pet.id}`}
                  className="card fade-in-up hover:shadow-lg transition-shadow"
                  style={{ cursor: 'pointer', textDecoration: 'none' }}
                >
                  <div className="flex gap-4" style={{ marginBottom: '16px' }}>
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'var(--color-navy)', overflow: 'hidden',
                      }}
                    >
                      {pet.photo_url ? (
                        <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <SpeciesAvatar species={pet.species} size={32} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: '2px' }}>
                        <h3 className="text-xl" style={{ fontWeight: 600 }}>{pet.name}</h3>
                        {pet.user_role && pet.user_role !== 'owner' && (
                          <span className="badge badge-navy" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>Shared with you</span>
                        )}
                      </div>
                      <p className="text-sm capitalize" style={{ color: 'var(--color-surface-500)' }}>
                        {pet.breed ? `${pet.breed}` : pet.species}
                        {pet.date_of_birth && (() => {
                          const born = new Date(pet.date_of_birth!.split('T')[0] + 'T00:00:00');
                          const years = Math.floor((Date.now() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                          return years > 0 ? ` \u2022 ${years} year${years !== 1 ? 's' : ''}` : '';
                        })()}
                      </p>

                      {/* Health context */}
                      {health && (
                        <div className="dashboard-pet-health">
                          {vaccineStatus && (
                            <span className={`status-dot status-dot-${vaccineStatus.type}`}>
                              {vaccineStatus.label}
                            </span>
                          )}
                          {activeConditions > 0 && (
                            <span className="status-dot status-dot-warning">
                              {activeConditions} active condition{activeConditions !== 1 ? 's' : ''}
                            </span>
                          )}
                          {alertCount > 0 && (
                            <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>
                              {alertCount} alert{alertCount !== 1 ? 's' : ''} on card
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end" style={{ borderTop: '1px solid var(--color-surface-100)', paddingTop: '12px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-surface-400)">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Action Items */}
          {actionItems.length > 0 && (
            <div className="dashboard-action-items">
              <h2 className="text-lg mb-3" style={{ color: 'var(--color-navy)', fontWeight: 600 }}>Action Items</h2>
              {actionItems.map((item, i) => (
                <Link
                  key={i}
                  to={`/pets/${item.petId}/health`}
                  className={`dashboard-action-item dashboard-action-item-${item.type}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {item.type === 'danger' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-danger)">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-warning)">
                      <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6z"/>
                    </svg>
                  )}
                  <span>{item.text}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <AddPetModal
          onClose={() => setShowAddModal(false)}
          onPetAdded={handlePetAdded}
        />
      )}
    </div>
  );
}
