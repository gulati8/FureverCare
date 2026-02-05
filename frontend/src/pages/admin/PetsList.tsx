import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { adminApi, AdminPet, PetsQueryOptions } from '../../api/admin';
import PetDetailModal from './PetDetailModal';

export default function PetsList() {
  const { token } = useAuth();
  const [pets, setPets] = useState<AdminPet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  // Filter and pagination state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<PetsQueryOptions['sortBy']>('id');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 25;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadPets = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const options: PetsQueryOptions = {
        limit,
        offset: page * limit,
        sortBy,
        sortOrder,
      };

      if (search) options.search = search;
      if (speciesFilter !== 'all') options.species = speciesFilter;

      const result = await adminApi.fetchPets(token, options);
      setPets(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pets');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, sortBy, sortOrder, search, speciesFilter]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  const handleSort = (column: PetsQueryOptions['sortBy']) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPage(0);
  };

  const handlePrevPage = () => {
    if (page > 0) setPage(page - 1);
  };

  const handleNextPage = () => {
    if ((page + 1) * limit < total) setPage(page + 1);
  };

  const formatRelativeDate = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  const getTotalRecords = (pet: AdminPet) => {
    return (
      Number(pet.condition_count) +
      Number(pet.medication_count) +
      Number(pet.vaccination_count) +
      Number(pet.allergy_count) +
      Number(pet.vet_count)
    );
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'ASC' ? (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pets</h1>
        <p className="text-gray-600 mt-1">View all pet profiles and health records</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by pet name or owner..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input w-full"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={speciesFilter}
              onChange={(e) => {
                setSpeciesFilter(e.target.value);
                setPage(0);
              }}
              className="input w-full"
            >
              <option value="all">All Species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No pets found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('id')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>ID</span>
                        <SortIcon column="id" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Name</span>
                        <SortIcon column="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('species')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Species</span>
                        <SortIcon column="species" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('owner_name')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Owner</span>
                        <SortIcon column="owner_name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Created</span>
                        <SortIcon column="created_at" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pets.map((pet) => (
                    <tr
                      key={pet.id}
                      onClick={() => setSelectedPetId(pet.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{pet.id}</td>
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                          {pet.photo_url ? (
                            <img
                              src={pet.photo_url}
                              alt={pet.name}
                              className="w-8 h-8 object-cover"
                            />
                          ) : (
                            <span className="text-sm">
                              {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{pet.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm text-gray-900 capitalize">{pet.species}</span>
                          {pet.breed && (
                            <span className="text-sm text-gray-500"> • {pet.breed}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm text-gray-900">{pet.owner_name}</div>
                          <div className="text-xs text-gray-500">{pet.owner_email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{getTotalRecords(pet)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{formatRelativeDate(pet.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-gray-700 text-center sm:text-left">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} pets
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={(page + 1) * limit >= total}
                  className="px-3 py-1.5 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pet Detail Modal */}
      {selectedPetId && (
        <PetDetailModal
          petId={selectedPetId}
          onClose={() => setSelectedPetId(null)}
        />
      )}
    </div>
  );
}
