import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface InviteDetails {
  petName: string;
  role: string;
  expiresAt: string;
}

export default function AcceptInvite() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInviteDetails();
  }, [inviteCode]);

  const loadInviteDetails = async () => {
    if (!inviteCode) return;
    try {
      const response = await fetch(`${API_URL}/api/owners/invite/${inviteCode}`);
      if (!response.ok) {
        throw new Error('Invalid or expired invitation');
      }
      const data = await response.json();
      setInvite(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token || !inviteCode) return;
    setIsAccepting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/owners/accept/${inviteCode}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept invitation');
      }

      const data = await response.json();
      navigate(`/pets/${data.pet.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/dashboard" className="btn-primary inline-block">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐾</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You've been invited!</h1>
          <p className="text-gray-600 mt-2">
            Someone wants to share access to their pet with you.
          </p>
        </div>

        {invite && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{invite.petName}</p>
              <p className="text-sm text-gray-500 mt-1">
                Role: <span className="font-medium capitalize">{invite.role}</span>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Please sign in or create an account to accept this invitation.
            </p>
            <Link
              to={`/login?redirect=/invite/${inviteCode}`}
              className="btn-primary w-full block text-center"
            >
              Sign In
            </Link>
            <Link
              to={`/register?redirect=/invite/${inviteCode}`}
              className="btn-secondary w-full block text-center"
            >
              Create Account
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="btn-primary w-full"
            >
              {isAccepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <Link
              to="/dashboard"
              className="btn-secondary w-full block text-center"
            >
              Maybe Later
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
