import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { petsApi, Pet, CreatePetInput } from '../api/client';
import PhotoUpload from './PhotoUpload';

interface Props {
  pet: Pet;
  onClose: () => void;
  onPetUpdated: (pet: Pet) => void;
}

export default function EditPetModal({ pet, onClose, onPetUpdated }: Props) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(pet.photo_url);

  const [formData, setFormData] = useState<CreatePetInput>({
    name: pet.name,
    species: pet.species,
    breed: pet.breed || '',
    date_of_birth: pet.date_of_birth ? pet.date_of_birth.split('T')[0] : '',
    sex: pet.sex || '',
    weight_kg: pet.weight_kg ? Number(pet.weight_kg) : undefined,
    microchip_id: pet.microchip_id || '',
    special_instructions: pet.special_instructions || '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setError('');

    try {
      const updatedPet = await petsApi.update(pet.id, {
        ...formData,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : undefined,
        photo_url: currentPhotoUrl || undefined,
      }, token);
      onPetUpdated(updatedPet);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pet');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpdated = (photoUrl: string | null) => {
    setCurrentPhotoUrl(photoUrl);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Edit {pet.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Photo Upload */}
          <div className="mb-6">
            <PhotoUpload
              petId={pet.id}
              currentPhotoUrl={currentPhotoUrl}
              onPhotoUpdated={handlePhotoUpdated}
            />
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Pet Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Species *</label>
              <select
                required
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                className="input"
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="rabbit">Rabbit</option>
                <option value="hamster">Hamster</option>
                <option value="fish">Fish</option>
                <option value="reptile">Reptile</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Breed</label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Sex</label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  className="input"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="neutered_male">Neutered Male</option>
                  <option value="spayed_female">Spayed Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight_kg || ''}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Microchip ID</label>
                <input
                  type="text"
                  value={formData.microchip_id}
                  onChange={(e) => setFormData({ ...formData, microchip_id: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Special Instructions</label>
              <textarea
                value={formData.special_instructions}
                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                className="input"
                rows={3}
                placeholder="Any special care instructions for emergency staff..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
