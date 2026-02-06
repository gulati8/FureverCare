import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, EmergencyCard, ShareTokenInfo, API_URL } from '../api/client';
import EmergencyCardView from '../components/EmergencyCardView';

export default function TokenCard() {
  const { token } = useParams<{ token: string }>();
  const [tokenInfo, setTokenInfo] = useState<ShareTokenInfo | null>(null);
  const [card, setCard] = useState<EmergencyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [isPinError, setIsPinError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (token) {
      loadTokenInfo();
    }
  }, [token]);

  const loadTokenInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await publicApi.getTokenInfo(token!);
      setTokenInfo(info);

      // If no PIN required, load card immediately
      if (!info.requires_pin) {
        await loadCard();
      }
    } catch (err: any) {
      if (err.message.includes('expired') || err.message.includes('deactivated')) {
        setError('This share link has expired or been deactivated.');
      } else if (err.message.includes('not found')) {
        setError('Share link not found. It may have been deleted.');
      } else {
        setError('Failed to load share link information.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCard = async (pinCode?: string) => {
    setIsVerifying(true);
    setIsPinError(false);
    try {
      const cardData = await publicApi.accessWithToken(token!, pinCode);
      setCard(cardData);
    } catch (err: any) {
      if (err.message.includes('Invalid PIN')) {
        setIsPinError(true);
        setPin('');
      } else if (err.message.includes('PIN required')) {
        // Expected when PIN is needed
      } else {
        setError('Failed to access emergency card.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      loadCard(pin);
    }
  };

  const getFullPhotoUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // PIN entry form
  if (tokenInfo?.requires_pin && !card) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">PIN Required</h1>
            <p className="text-gray-600">
              {tokenInfo.label ? `Access to "${tokenInfo.label}"` : 'This share link'} requires a PIN.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter PIN"
                className={`input text-center text-lg tracking-widest ${isPinError ? 'border-red-500' : ''}`}
                autoFocus
                minLength={4}
                maxLength={20}
              />
              {isPinError && (
                <p className="text-red-600 text-sm mt-1 text-center">Invalid PIN. Please try again.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={pin.length < 4 || isVerifying}
              className="btn-primary w-full"
            >
              {isVerifying ? 'Verifying...' : 'Access Card'}
            </button>
          </form>

          {tokenInfo.expires_at && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Link expires: {new Date(tokenInfo.expires_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!card) return null;

  return <EmergencyCardView card={card} resolvePhotoUrl={getFullPhotoUrl} />;
}
