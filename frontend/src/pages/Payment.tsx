import { useLocation, Navigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '../providers/StripeProvider';
import CheckoutForm from '../components/CheckoutForm';

export default function Payment() {
  const location = useLocation();
  const { clientSecret, isSetup } = (location.state as { clientSecret?: string; isSetup?: boolean }) ?? {};

  if (!clientSecret) {
    return <Navigate to="/pricing" replace />;
  }

  const returnUrl = `${window.location.origin}/payment/confirm`;

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete your payment</h1>
      <p className="text-gray-600 mb-8">
        Enter your payment details below. Your information is secured by Stripe.
      </p>

      <div className="card">
        <Elements stripe={getStripePromise()} options={{ clientSecret }}>
          <CheckoutForm
            isSetup={isSetup}
            returnUrl={returnUrl}
            submitLabel={isSetup ? 'Start trial' : 'Subscribe'}
          />
        </Elements>
      </div>
    </div>
  );
}
