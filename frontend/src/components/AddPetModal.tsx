import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { petsApi, Pet, CreatePetInput } from '../api/client';

interface Props {
  onClose: () => void;
  onPetAdded: (pet: Pet) => void;
}

export default function AddPetModal({ onClose, onPetAdded }: Props) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreatePetInput>({
    name: '',
    species: 'dog',
    breed: '',
    date_of_birth: '',
    sex: '',
    weight_kg: undefined,
    weight_unit: 'lbs',
    microchip_id: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setError('');

    try {
      const pet = await petsApi.create({
        ...formData,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : undefined,
      }, token);
      onPetAdded(pet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add pet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add New Pet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
                placeholder="Max"
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
                placeholder="Golden Retriever"
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

            <div>
              <label className="label">Weight</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight_kg || ''}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                  className="input flex-1"
                  placeholder="25.5"
                />
                <select
                  value={formData.weight_unit}
                  onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value as 'lbs' | 'kg' })}
                  className="input w-20"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Microchip ID</label>
              <input
                type="text"
                value={formData.microchip_id}
                onChange={(e) => setFormData({ ...formData, microchip_id: e.target.value })}
                className="input"
                placeholder="123456789"
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
                {isLoading ? 'Adding...' : 'Add Pet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
