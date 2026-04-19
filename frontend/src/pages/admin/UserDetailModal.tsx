import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { adminApi, AdminUserDetails } from '../../api/admin';
import { resolveAssetUrl } from '../../utils/assetUrls';

interface Props {
  userId: number;
  onClose: () => void;
}

export default function UserDetailModal({ userId, onClose }: Props) {
  const { token } = useAuth();
  const [user, setUser] = useState<AdminUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await adminApi.fetchUserById(userId, token);
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [userId, token]);

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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-navy">User Details</h2>
              {user && (
                <p className="text-sm text-surface-500 mt-1">ID: {user.id}</p>
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
          ) : user ? (
            <div className="space-y-6">
              {/* User Profile */}
              <div className="bg-surface rounded-lg p-4">
                <h3 className="text-lg font-semibold text-navy mb-3">Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-surface-500">Name</label>
                    <p className="text-navy">{user.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-500">Email</label>
                    <p className="text-navy">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-500">Phone</label>
                    <p className="text-navy">{user.phone || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-500">Admin Status</label>
                    <p>
                      {user.is_admin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-light text-success">
                          Admin
                        </span>
                      ) : (
                        <span className="text-surface-600">Regular User</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscription Info */}
              <div className="bg-surface rounded-lg p-4">
                <h3 className="text-lg font-semibold text-navy mb-3">Subscription</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-surface-500">Plan</label>
                    <p className="text-navy capitalize">{user.subscription_tier}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-500">Status</label>
                    <p>
                      {user.subscription_tier === 'premium' ? (
                        <>
                          {user.subscription_status === 'active' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-light text-success">Active</span>
                          )}
                          {user.subscription_status === 'trialing' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-info-light text-info">Trial</span>
                          )}
                          {user.subscription_status === 'past_due' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-light text-warning-dark">Past Due</span>
                          )}
                          {user.subscription_status === 'canceled' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger-light text-danger">Canceled</span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-600">Free</span>
                      )}
                    </p>
                  </div>
                  {user.subscription_current_period_end && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-surface-500">
                        {user.subscription_status === 'canceled' ? 'Access Until' : 'Current Period Ends'}
                      </label>
                      <p className="text-navy">
                        {new Date(user.subscription_current_period_end).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-surface rounded-lg p-4">
                <h3 className="text-lg font-semibold text-navy mb-3">Account Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-surface-500">Created</label>
                    <p className="text-navy">{new Date(user.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-500">Last Updated</label>
                    <p className="text-navy">{new Date(user.updated_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-500">Owned Pets</label>
                    <p className="text-navy font-semibold">{user.owned_pet_count}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-500">Shared Pets</label>
                    <p className="text-navy font-semibold">{user.shared_pet_count}</p>
                  </div>
                </div>
              </div>

              {/* Pets List */}
              {user.pets && user.pets.length > 0 && (
                <div className="bg-surface rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-navy mb-3">
                    Pets ({user.pets.length})
                  </h3>
                  <div className="space-y-3">
                    {user.pets.map((pet) => (
                      <div
                        key={pet.id}
                        className="bg-white rounded-lg p-3 flex items-center space-x-3"
                      >
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {pet.photo_url ? (
                            <img
                              src={resolveAssetUrl(pet.photo_url)!}
                              alt={pet.name}
                              className="w-12 h-12 object-cover"
                            />
                          ) : (
                            <span className="text-xl">
                              {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy">{pet.name}</p>
                          <p className="text-sm text-surface-500 capitalize">{pet.species}</p>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            pet.role === 'owner'
                              ? 'bg-info-light text-info'
                              : 'bg-surface-100 text-navy'
                          }`}>
                            {pet.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user.pets && user.pets.length === 0 && (
                <div className="text-center py-8 text-surface-500">
                  <p>This user has no pets.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
