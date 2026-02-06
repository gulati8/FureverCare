import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { billingApi } from '../api/billing';
import PaymentMethodList from '../components/PaymentMethodList';
import AddPaymentMethodModal from '../components/AddPaymentMethodModal';

export default function BillingSettings() {
  const { token, subscription, refreshSubscription } = useAuth();
  const [isLoadingCancel, setIsLoadingCancel] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isFreeTier = !subscription || subscription.tier === 'free';
  const isPremium = subscription?.tier === 'premium';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  const handleCancelSubscription = async () => {
    if (!token) return;
    setError('');
    setIsLoadingCancel(true);
    try {
      await billingApi.cancelSubscription(token);
      setShowCancelConfirm(false);
      setSuccessMessage('Your subscription has been canceled. You will retain access until the end of your current billing period.');
      await refreshSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setIsLoadingCancel(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscription) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Free</span>;
    }
    switch (subscription.status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'trialing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Trial</span>;
      case 'past_due':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Past Due</span>;
      case 'canceled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Canceled</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Free</span>;
    }
  };

  const getTierDisplay = () => {
    if (!subscription || subscription.tier === 'free') {
      return 'Free';
    }
    return 'Premium';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Billing Settings</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-600">Plan</span>
            <span className="font-medium text-gray-900">{getTierDisplay()}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-600">Status</span>
            {getStatusBadge()}
          </div>

          {isPremium && subscription?.currentPeriodEnd && (
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-600">
                {subscription.status === 'canceled' ? 'Access Until' : 'Next Billing Date'}
              </span>
              <span className="font-medium text-gray-900">
                {subscription.currentPeriodEnd.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {isFreeTier ? (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h3 className="font-medium text-primary-900 mb-2">Upgrade to Premium</h3>
              <p className="text-sm text-primary-700 mb-4">
                Unlock unlimited pets, advanced health tracking, and priority support.
              </p>
              <Link to="/pricing" className="btn-primary inline-block">
                View Pricing Plans
              </Link>
            </div>
          ) : (
            <>
              {isActive && subscription?.status !== 'canceled' && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full btn-outline text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel Subscription
                </button>
              )}

              {subscription?.status === 'canceled' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Your subscription is canceled but you still have access until{' '}
                    {subscription.currentPeriodEnd?.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    .
                  </p>
                  <Link to="/pricing" className="text-sm text-primary-600 hover:text-primary-500 font-medium mt-2 inline-block">
                    Resubscribe
                  </Link>
                </div>
              )}

              {subscription?.status === 'past_due' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    Your payment is past due. Please update your payment method to continue your subscription.
                  </p>
                  <button
                    onClick={() => setShowUpdatePayment(true)}
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    Update Payment Method
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      {isPremium && (
        <div className="card mt-6">
          <PaymentMethodList />
        </div>
      )}

      {/* Update Payment Method Modal (for past_due) */}
      {showUpdatePayment && (
        <AddPaymentMethodModal
          onClose={() => setShowUpdatePayment(false)}
          onAdded={() => {
            setShowUpdatePayment(false);
            setSuccessMessage('Payment method updated successfully.');
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Subscription?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your Premium subscription? You will retain access to
              premium features until the end of your current billing period.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 btn-outline"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isLoadingCancel}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoadingCancel ? 'Canceling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
