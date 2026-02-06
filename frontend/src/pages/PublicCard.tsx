import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicApi, EmergencyCard } from '../api/client';
import EmergencyCardView from '../components/EmergencyCardView';

export default function PublicCard() {
  const { shareId } = useParams<{ shareId: string }>();
  const [card, setCard] = useState<EmergencyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCard();
  }, [shareId]);

  const loadCard = async () => {
    if (!shareId) return;
    try {
      const data = await publicApi.getEmergencyCard(shareId);
      setCard(data);
    } catch (err) {
      setError('This emergency card could not be found or may have been removed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="mx-auto w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
          </svg>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Card Not Found</h1>
          <p className="mt-2 text-gray-500">{error}</p>
          <Link to="/" className="mt-4 inline-block btn-primary">
            Go to FureverCare
          </Link>
        </div>
      </div>
    );
  }

  return <EmergencyCardView card={card} />;
}
