import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

interface CheckoutFormProps {
  isSetup?: boolean;
  returnUrl: string;
  onSuccess?: () => void;
  submitLabel?: string;
}

export default function CheckoutForm({ isSetup, returnUrl, onSuccess, submitLabel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const confirmFn = isSetup ? stripe.confirmSetup : stripe.confirmPayment;
    const { error: stripeError } = await confirmFn({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Something went wrong.');
      setIsProcessing(false);
    } else {
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full btn-accent"
      >
        {isProcessing ? 'Processing...' : submitLabel ?? 'Pay now'}
      </button>
    </form>
  );
}
