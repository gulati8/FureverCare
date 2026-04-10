import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { invitationsApi, PendingInvitation } from '../api/client';

interface Props {
  onAccepted?: () => void;
}

export default function PendingInvitations({ onAccepted }: Props) {
  const { token } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    invitationsApi.getMyPending(token)
      .then(data => {
        setInvitations(data);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, [token]);

  const handleAccept = async (invitation: PendingInvitation) => {
    if (!token) return;
    try {
      await invitationsApi.accept(invitation.invite_code, token);
      setInvitations(prev => prev.filter(i => i.id !== invitation.id));
      onAccepted?.();
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    }
  };

  const handleDismiss = (id: number) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  if (!loaded) return null;

  const visible = invitations.filter(i => !dismissed.has(i.id));

  if (visible.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="bg-warm border border-surface-200 rounded-xl p-5">
        <h2 className="section-title mb-3">Pending Invitations</h2>
        {visible.map(invitation => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-surface-200 mb-2 last:mb-0"
          >
            <div>
              <p className="text-base font-semibold text-navy">{invitation.pet_name}</p>
              <p className="text-sm text-surface-600">
                Invited by {invitation.inviter_name} as{' '}
                {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
              </p>
              <p className="text-xs text-surface-500">
                Expires {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAccept(invitation)}
              >
                Accept
              </button>
              <button
                className="text-sm text-surface-500 hover:text-surface-700"
                onClick={() => handleDismiss(invitation.id)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
