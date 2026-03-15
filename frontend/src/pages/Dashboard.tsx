import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { petsApi, Pet } from '../api/client';
import AddPetModal from '../components/AddPetModal';
import UpgradeBanner from '../components/UpgradeBanner';

// Pet limits by tier
const FREE_TIER_PET_LIMIT = 1;

export default function Dashboard() {
  const { token, isPremium } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadPets();
  }, [token]);

  const loadPets = async () => {
    if (!token) return;
    try {
      const data = await petsApi.list(token);
      setPets(data);
    } catch (err) {
      console.error('Failed to load pets:', err);
    } finally {
      setIsLoading(false);
    }
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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--color-steel)">
              <path d="M12 2C9.24 2 7 4.24 7 7c0 1.38.56 2.63 1.46 3.54C7.56 11.37 7 12.62 7 14v4c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-4c0-1.38-.56-2.63-1.46-3.46C16.44 9.63 17 8.38 17 7c0-2.76-2.24-5-5-5z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-navy)' }}>No pets yet</h3>
          <p className="mt-2" style={{ color: 'var(--color-surface-500)' }}>Add your first pet to create an emergency health card.</p>
          <button onClick={() => setShowAddModal(true)} className="mt-4 btn btn-primary">
            Add Your First Pet
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              to={`/pets/${pet.id}`}
              className="card fade-in-up"
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
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#4A7FB5">
                      <path d="M12 2C9.24 2 7 4.24 7 7c0 1.38.56 2.63 1.46 3.54C7.56 11.37 7 12.62 7 14v4c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-4c0-1.38-.56-2.63-1.46-3.46C16.44 9.63 17 8.38 17 7c0-2.76-2.24-5-5-5z"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="text-xl" style={{ fontWeight: 600, marginBottom: '2px' }}>{pet.name}</h3>
                  <p className="text-sm capitalize" style={{ color: 'var(--color-surface-500)' }}>
                    {pet.breed ? `${pet.breed}` : pet.species}
                    {pet.date_of_birth && (() => {
                      const born = new Date(pet.date_of_birth!.split('T')[0] + 'T00:00:00');
                      const years = Math.floor((Date.now() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                      return years > 0 ? ` \u2022 ${years} year${years !== 1 ? 's' : ''}` : '';
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--color-surface-100)', paddingTop: '12px' }}>
                <span className="badge badge-navy">View profile</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-surface-400)">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
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
