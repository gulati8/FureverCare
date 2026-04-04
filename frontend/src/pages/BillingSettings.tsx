import { useState, Component, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { billingApi } from '../api/billing';
import PaymentMethodList from '../components/PaymentMethodList';
import AddPaymentMethodModal from '../components/AddPaymentMethodModal';

// Simple error boundary to prevent a render crash from blanking the entire page
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-navy mb-4">Billing Settings</h1>
          <div className="card">
            <p className="text-danger font-medium mb-2">Something went wrong loading this page.</p>
            <p className="text-surface-600 text-sm">{this.state.message}</p>
            <button
              className="btn btn-secondary mt-4"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function BillingSettingsContent() {
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
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-navy">Free</span>;
    }
    switch (subscription.status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">Active</span>;
      case 'trialing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-light text-info">Trial</span>;
      case 'past_due':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning-dark">Past Due</span>;
      case 'canceled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-light text-danger">Canceled</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-navy">Free</span>;
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
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        <span className="sep">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </span>
        <span className="current">Billing</span>
      </div>
      <h1 className="page-title mb-8">Billing Settings</h1>

      {error && (
        <div className="mb-6 bg-danger-light border border-danger-light text-danger px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-success-light border border-success-light text-success px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="card">
        <h2 className="section-title mb-4">Current Subscription</h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-surface-200">
            <span className="text-surface-600">Plan</span>
            <span className="font-medium text-navy">{getTierDisplay()}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-surface-200">
            <span className="text-surface-600">Status</span>
            {getStatusBadge()}
          </div>

          {isPremium && subscription?.currentPeriodEnd && (
            <div className="flex justify-between items-center py-3 border-b border-surface-200">
              <span className="text-surface-600">
                {subscription.status === 'canceled' ? 'Access Until' : 'Next Billing Date'}
              </span>
              <span className="font-medium text-navy">
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
            <div className="bg-warm border border-surface-200 rounded-lg p-4">
              <h3 className="font-medium text-navy mb-2">Upgrade to Premium</h3>
              <p className="text-sm text-surface-600 mb-4">
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
                  className="w-full btn btn-ghost border border-danger text-danger hover:bg-danger-light"
                >
                  Cancel Subscription
                </button>
              )}

              {subscription?.status === 'canceled' && (
                <div className="bg-warning-light border border-warning-light rounded-lg p-4">
                  <p className="text-sm text-warning-dark">
                    Your subscription is canceled but you still have access until{' '}
                    {subscription.currentPeriodEnd?.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    .
                  </p>
                  <Link to="/pricing" className="text-sm text-steel hover:text-steel-dark font-medium mt-2 inline-block">
                    Resubscribe
                  </Link>
                </div>
              )}

              {subscription?.status === 'past_due' && (
                <div className="bg-warning-light border border-warning-light rounded-lg p-4">
                  <p className="text-sm text-warning-dark mb-2">
                    Your payment is past due. Please update your payment method to continue your subscription.
                  </p>
                  <button
                    onClick={() => setShowUpdatePayment(true)}
                    className="text-sm text-steel hover:text-steel-dark font-medium"
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
            <h3 className="text-lg font-semibold text-navy mb-2">Cancel Subscription?</h3>
            <p className="text-surface-600 mb-6">
              Are you sure you want to cancel your Premium subscription? You will retain access to
              premium features until the end of your current billing period.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 btn btn-secondary"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isLoadingCancel}
                className="flex-1 btn btn-danger disabled:opacity-50"
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

export default function BillingSettings() {
  return (
    <ErrorBoundary>
      <BillingSettingsContent />
    </ErrorBoundary>
  );
}
