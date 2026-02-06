import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { useAuth } from '../hooks/useAuth';
import { billingApi } from '../api/billing';
import { getStripePromise } from '../providers/StripeProvider';
import CheckoutForm from './CheckoutForm';

interface AddPaymentMethodModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddPaymentMethodModal({ onClose, onAdded }: AddPaymentMethodModalProps) {
  const { token } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    billingApi.createSetupIntent(token).then(
      (res) => setClientSecret(res.clientSecret),
      () => setError('Failed to initialize payment form'),
    );
  }, [token]);

  const returnUrl = `${window.location.origin}/billing`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Payment Method</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {clientSecret ? (
          <Elements stripe={getStripePromise()} options={{ clientSecret }}>
            <CheckoutForm
              isSetup
              returnUrl={returnUrl}
              onSuccess={onAdded}
              submitLabel="Save payment method"
            />
          </Elements>
        ) : !error ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
