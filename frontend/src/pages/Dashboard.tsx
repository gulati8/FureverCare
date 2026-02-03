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

  // Calculate pet limit based on subscription
  const petLimit = isPremium ? Infinity : FREE_TIER_PET_LIMIT;
  const isAtPetLimit = pets.length >= petLimit;

  // Handle add pet button click
  const handleAddPetClick = () => {
    if (isAtPetLimit) {
      // Don't open modal if at limit - the banner will show
      return;
    }
    setShowAddModal(true);
  };

  // Get pet count display text
  const getPetCountText = () => {
    if (isPremium) {
      return `${pets.length} pet${pets.length !== 1 ? 's' : ''}`;
    }
    return `${pets.length}/${petLimit} pet${petLimit !== 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Pets</h1>
          <p className="text-sm text-gray-500 mt-1">{getPetCountText()}</p>
        </div>
        <button
          onClick={handleAddPetClick}
          disabled={isAtPetLimit}
          className={`btn-primary ${isAtPetLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          + Add Pet
        </button>
      </div>

      {/* Show upgrade banner when at pet limit */}
      {isAtPetLimit && (
        <div className="mb-6">
          <UpgradeBanner
            type="pet_limit"
            petCount={pets.length}
            petLimit={petLimit}
          />
        </div>
      )}

      {pets.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto w-24 h-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No pets yet</h3>
          <p className="mt-2 text-gray-500">Add your first pet to create an emergency health card.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 btn-primary"
          >
            Add Your First Pet
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              to={`/pets/${pet.id}`}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {pet.photo_url ? (
                    <img
                      src={pet.photo_url}
                      alt={pet.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">
                      {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{pet.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {pet.breed ? `${pet.breed} ${pet.species}` : pet.species}
                  </p>
                  {pet.date_of_birth && (
                    <p className="text-sm text-gray-400">
                      Born: {new Date(pet.date_of_birth.split('T')[0] + 'T00:00:00').toLocaleDateString()}
                    </p>
                  )}
                </div>
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
