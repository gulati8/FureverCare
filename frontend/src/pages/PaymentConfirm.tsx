import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getStripePromise } from '../providers/StripeProvider';

type Status = 'loading' | 'succeeded' | 'processing' | 'failed';

export default function PaymentConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSubscription } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const clientSecret =
      searchParams.get('payment_intent_client_secret') ??
      searchParams.get('setup_intent_client_secret');

    if (!clientSecret) {
      setStatus('failed');
      setMessage('Missing payment information.');
      return;
    }

    const isSetup = searchParams.has('setup_intent_client_secret');

    getStripePromise().then(async (stripe) => {
      if (!stripe) {
        setStatus('failed');
        setMessage('Failed to load payment processor.');
        return;
      }

      const result = isSetup
        ? await stripe.retrieveSetupIntent(clientSecret)
        : await stripe.retrievePaymentIntent(clientSecret);

      const intent = isSetup
        ? (result as { setupIntent?: { status: string } }).setupIntent
        : (result as { paymentIntent?: { status: string } }).paymentIntent;

      if (!intent) {
        setStatus('failed');
        setMessage('Could not retrieve payment status.');
        return;
      }

      switch (intent.status) {
        case 'succeeded':
          setStatus('succeeded');
          setMessage('Your subscription is now active!');
          await refreshSubscription();
          break;
        case 'processing':
          setStatus('processing');
          setMessage('Your payment is being processed. We\'ll update your account shortly.');
          break;
        default:
          setStatus('failed');
          setMessage('Payment was not completed. Please try again.');
      }
    });
  }, [searchParams, refreshSubscription]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8 text-center">
      <div className="card">
        {status === 'succeeded' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Premium!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'processing' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/pricing" className="btn-accent inline-block">
              Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
