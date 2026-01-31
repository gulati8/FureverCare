import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';
import { shareTokensApi, ShareToken } from '../api/client';

interface ShareWalletProps {
  petId: number;
  petName: string;
  onClose: () => void;
}

type ViewMode = 'list' | 'create' | 'view';

const EXPIRY_OPTIONS = [
  { label: '1 hour', hours: 1 },
  { label: '6 hours', hours: 6 },
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
  { label: 'Never', hours: 0 },
];

export default function ShareWallet({ petId, petName, onClose }: ShareWalletProps) {
  const { token: authToken } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<ShareToken | null>(null);

  // Create form state
  const [label, setLabel] = useState('');
  const [pin, setPin] = useState('');
  const [expiryHours, setExpiryHours] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<number | 'permanent' | null>(null);

  useEffect(() => {
    loadTokens();
  }, [petId, authToken]);

  const loadTokens = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const data = await shareTokensApi.list(petId, authToken);
      setTokens(data);
    } catch (err) {
      console.error('Failed to load share tokens:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!authToken) return;
    setIsCreating(true);
    try {
      const newToken = await shareTokensApi.create(
        petId,
        {
          label: label.trim() || undefined,
          pin: pin || undefined,
          expires_in_hours: expiryHours || undefined,
        },
        authToken
      );
      setTokens([newToken, ...tokens]);
      setSelectedToken(newToken);
      setViewMode('view');
      // Reset form
      setLabel('');
      setPin('');
      setExpiryHours(0);
    } catch (err) {
      console.error('Failed to create share token:', err);
      alert('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (tokenId: number) => {
    if (!authToken) return;
    if (!confirm('Delete this share link? Anyone with this link will lose access.')) return;

    try {
      await shareTokensApi.delete(petId, tokenId, authToken);
      setTokens(tokens.filter(t => t.id !== tokenId));
      if (selectedToken?.id === tokenId) {
        setSelectedToken(null);
        setViewMode('list');
      }
    } catch (err) {
      console.error('Failed to delete token:', err);
      alert('Failed to delete share link');
    }
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const handleCopy = async (url: string, id: number | 'permanent') => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never expires';
    const date = new Date(expiresAt);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Expired';
    if (diff < 3600000) return `Expires in ${Math.ceil(diff / 60000)} min`;
    if (diff < 86400000) return `Expires in ${Math.ceil(diff / 3600000)} hours`;
    return `Expires ${date.toLocaleDateString()}`;
  };

  const formatLastAccess = (lastAccessed: string | null, accessCount: number) => {
    if (accessCount === 0) return 'Never accessed';
    if (!lastAccessed) return `${accessCount} views`;
    const date = new Date(lastAccessed);
    return `${accessCount} views, last ${date.toLocaleDateString()}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Custom Share Links</h2>
            <p className="text-sm text-gray-500">Create time-limited or PIN-protected links for {petName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'list' && (
            <div className="space-y-4">
              {/* Create New Link Button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Create links for pet sitters, boarding, or temporary access.
                </p>
                <button
                  onClick={() => setViewMode('create')}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  + New Link
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No custom share links yet</p>
                  <p className="text-sm">Use these for pet sitters, boarding facilities, or anyone who needs temporary access.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokens.map(t => (
                    <div
                      key={t.id}
                      className={`border rounded-lg p-4 ${t.is_expired || !t.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {t.label || 'Unnamed Link'}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {t.has_pin && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">PIN</span>}
                            <span>{formatExpiry(t.expires_at)}</span>
                          </div>
                        </div>
                        {t.is_expired ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Expired</span>
                        ) : !t.is_active ? (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Deactivated</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-3">
                        {formatLastAccess(t.last_accessed_at, t.access_count)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedToken(t);
                            setViewMode('view');
                          }}
                          className="btn-secondary text-sm flex-1"
                        >
                          View QR
                        </button>
                        <button
                          onClick={() => handleCopy(getShareUrl(t.token), t.id)}
                          className="btn-secondary text-sm flex-1"
                        >
                          {copiedId === t.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-red-600 hover:text-red-800 text-sm px-2"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'create' && (
            <div className="space-y-4">
              <button
                onClick={() => setViewMode('list')}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to list
              </button>

              <div>
                <h3 className="font-medium text-gray-900 mb-4">Create Custom Share Link</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label (optional)
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder="e.g., For pet sitter"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration
                    </label>
                    <select
                      value={expiryHours}
                      onChange={e => setExpiryHours(parseInt(e.target.value))}
                      className="input"
                    >
                      {EXPIRY_OPTIONS.map(opt => (
                        <option key={opt.hours} value={opt.hours}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIN Protection (optional)
                    </label>
                    <input
                      type="text"
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      placeholder="Leave empty for no PIN"
                      maxLength={20}
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      4-20 characters. Viewers must enter this PIN to see the card.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="btn-primary w-full"
                >
                  {isCreating ? 'Creating...' : 'Create Share Link'}
                </button>
              </div>
            </div>
          )}

          {viewMode === 'view' && selectedToken && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSelectedToken(null);
                  setViewMode('list');
                }}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to list
              </button>

              <div className="text-center">
                <h3 className="font-medium text-gray-900 mb-1">
                  {selectedToken.label || 'Share Link'}
                </h3>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                  {selectedToken.has_pin && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">PIN Protected</span>
                  )}
                  <span>{formatExpiry(selectedToken.expires_at)}</span>
                </div>

                <div className="bg-white p-4 inline-block rounded-lg border mb-4">
                  <QRCodeSVG value={getShareUrl(selectedToken.token)} size={200} />
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Scan this QR code to access {petName}'s emergency health card.
                  {selectedToken.has_pin && ' A PIN will be required.'}
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl(selectedToken.token)}
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={() => handleCopy(getShareUrl(selectedToken.token), selectedToken.id)}
                    className="btn-primary whitespace-nowrap"
                  >
                    {copiedId === selectedToken.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-4">
                  {formatLastAccess(selectedToken.last_accessed_at, selectedToken.access_count)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
