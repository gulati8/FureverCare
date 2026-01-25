import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface PetOwner {
  id: number;
  user_id: number;
  role: 'owner' | 'editor' | 'viewer';
  user_name: string;
  user_email: string;
}

interface Invitation {
  id: number;
  email: string;
  role: 'editor' | 'viewer';
  expires_at: string;
}

interface Props {
  petId: number;
  petName: string;
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ManageAccessModal({ petId, petName, onClose }: Props) {
  const { token } = useAuth();
  const [owners, setOwners] = useState<PetOwner[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    loadAccessData();
  }, [petId, token]);

  const loadAccessData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/owners/pets/${petId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load access data');
      const data = await response.json();
      setOwners(data.owners);
      setInvitations(data.invitations);
      setIsOwner(data.isOwner);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!token || !inviteEmail.trim()) return;
    setIsInviting(true);
    setError('');
    setInviteSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/owners/pets/${petId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      const data = await response.json();
      setInviteSuccess(`Invitation sent! Share this link: ${data.inviteUrl}`);
      setInviteEmail('');
      loadAccessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      const response = await fetch(`${API_URL}/api/owners/pets/${petId}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to remove user');
      loadAccessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/owners/pets/${petId}/invite/${invitationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to cancel invitation');
      loadAccessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const handleUpdateRole = async (userId: number, newRole: 'editor' | 'viewer') => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/owners/pets/${petId}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!response.ok) throw new Error('Failed to update role');
      loadAccessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700';
      case 'editor': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Manage Access - {petName}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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

          {inviteSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm break-all">
              {inviteSuccess}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Current Users */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">People with access</h3>
                <ul className="space-y-2">
                  {owners.map((owner) => (
                    <li key={owner.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{owner.user_name}</p>
                        <p className="text-sm text-gray-500">{owner.user_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {owner.role === 'owner' ? (
                          <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(owner.role)}`}>
                            Owner
                          </span>
                        ) : isOwner ? (
                          <>
                            <select
                              value={owner.role}
                              onChange={(e) => handleUpdateRole(owner.user_id, e.target.value as 'editor' | 'viewer')}
                              className="text-sm border rounded px-2 py-1"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              onClick={() => handleRemoveUser(owner.user_id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(owner.role)}`}>
                            {owner.role.charAt(0).toUpperCase() + owner.role.slice(1)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pending Invitations */}
              {isOwner && invitations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Pending invitations</h3>
                  <ul className="space-y-2">
                    {invitations.map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{inv.email}</p>
                          <p className="text-xs text-gray-500">
                            {inv.role} • Expires {new Date(inv.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Invite Form */}
              {isOwner && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Invite someone</h3>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="input flex-1"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                      className="input w-28"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={isInviting || !inviteEmail.trim()}
                      className="btn-primary"
                    >
                      {isInviting ? '...' : 'Invite'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Viewers can see all pet info. Editors can also add/edit health records.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
