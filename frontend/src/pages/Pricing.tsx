import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { billingApi, PricingConfig, TrialConfig } from '../api/billing';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface Feature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
}

const features: Feature[] = [
  { name: 'Number of pets', free: '1 pet', premium: 'Unlimited' },
  { name: 'Basic health records', free: true, premium: true },
  { name: 'Emergency health card', free: true, premium: true },
  { name: 'Document upload & storage', free: false, premium: true },
  { name: 'Health timeline', free: false, premium: true },
  { name: 'Shared pet ownership', free: false, premium: true },
  { name: 'Priority support', free: false, premium: true },
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user, token, isPremium, subscription, openAuthModal } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [trialConfig, setTrialConfig] = useState<TrialConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('annual');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    try {
      const [pricingData, trialData] = await Promise.all([
        billingApi.getPricing(),
        billingApi.getTrialConfig(),
      ]);
      setPricing(pricingData);
      setTrialConfig(trialData);
    } catch (err) {
      console.error('Failed to load pricing:', err);
      setError('Failed to load pricing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !token) {
      openAuthModal('signup');
      return;
    }

    setIsCheckoutLoading(true);
    setError(null);

    try {
      const { clientSecret } = await billingApi.createSubscription(token, billingInterval);
      const isSetup = trialConfig != null && trialConfig.trial_days > 0;
      navigate('/payment', { state: { clientSecret, isSetup } });
    } catch (err) {
      console.error('Failed to create subscription:', err);
      setError('Failed to start checkout. Please try again.');
      setIsCheckoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const annualSavings = pricing
    ? (pricing.monthly_price_cents * 12 - pricing.annual_price_cents) / 100
    : 0;

  const currentPrice = pricing
    ? billingInterval === 'monthly'
      ? pricing.monthly_price_cents
      : pricing.annual_price_cents
    : 0;

  const isTrialing = subscription?.status === 'trialing';
  const hasActiveSubscription = isPremium;

  return (
    <div className="py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Keep your pet's health information organized and accessible.
          Start free or upgrade for unlimited features.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center items-center gap-4 mb-8">
        <button
          onClick={() => setBillingInterval('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            billingInterval === 'monthly'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingInterval('annual')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            billingInterval === 'annual'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Annual
          {annualSavings > 0 && (
            <span className="ml-2 text-xs bg-accent-400 text-white px-2 py-0.5 rounded-full">
              Save ${annualSavings.toFixed(0)}/yr
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2">
        {/* Free Tier */}
        <div className="card border-2 border-gray-200 relative">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Free</h2>
            <div className="text-4xl font-bold text-gray-900">
              $0
              <span className="text-lg font-normal text-gray-500">/mo</span>
            </div>
            <p className="text-gray-500 mt-2">Perfect for getting started</p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-center gap-3">
                {feature.free === true ? (
                  <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : feature.free === false ? (
                  <XMarkIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />
                ) : (
                  <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
                <span className={feature.free === false ? 'text-gray-400' : 'text-gray-700'}>
                  {feature.name}
                  {typeof feature.free === 'string' && (
                    <span className="text-gray-500 ml-1">({feature.free})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {user && !isPremium && (
            <div className="text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                Current Plan
              </span>
            </div>
          )}

          {!user && (
            <button
              onClick={() => openAuthModal('signup')}
              className="w-full btn-secondary"
            >
              Sign up free
            </button>
          )}
        </div>

        {/* Premium Tier */}
        <div className="card border-2 border-primary-500 relative">
          {hasActiveSubscription && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-500 text-white">
                {isTrialing ? 'Trial Active' : 'Current Plan'}
              </span>
            </div>
          )}

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Premium</h2>
            <div className="text-4xl font-bold text-gray-900">
              {formatPrice(currentPrice)}
              <span className="text-lg font-normal text-gray-500">
                /{billingInterval === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
            <p className="text-gray-500 mt-2">
              {trialConfig && trialConfig.trial_days > 0
                ? `${trialConfig.trial_days}-day free trial included`
                : 'For serious pet parents'}
            </p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.map((feature) => (
              <li key={feature.name} className="flex items-center gap-3">
                <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">
                  {feature.name}
                  {typeof feature.premium === 'string' && (
                    <span className="text-primary-600 font-medium ml-1">
                      ({feature.premium})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {hasActiveSubscription ? (
            <button
              onClick={() => navigate('/billing')}
              className="w-full btn-secondary"
            >
              Manage Subscription
            </button>
          ) : user ? (
            <button
              onClick={handleSubscribe}
              disabled={isCheckoutLoading}
              className="w-full btn-accent"
            >
              {isCheckoutLoading
                ? 'Loading...'
                : trialConfig && trialConfig.trial_days > 0
                ? 'Start Free Trial'
                : 'Subscribe Now'}
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('signup')}
              className="w-full btn-accent"
            >
              Sign up to start
            </button>
          )}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-4xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Compare Features
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900">Free</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900">Premium</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={feature.name}
                  className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                >
                  <td className="py-4 px-4 text-gray-700">{feature.name}</td>
                  <td className="py-4 px-4 text-center">
                    {feature.free === true ? (
                      <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                    ) : feature.free === false ? (
                      <XMarkIcon className="w-5 h-5 text-gray-300 mx-auto" />
                    ) : (
                      <span className="text-gray-700">{feature.free}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {feature.premium === true ? (
                      <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-primary-600 font-medium">{feature.premium}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ or Additional Info */}
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Questions about our plans?
        </h3>
        <p className="text-gray-600">
          All plans include access to our mobile-friendly emergency health cards.
          Premium users can cancel anytime from their billing portal.
        </p>
      </div>
    </div>
  );
}
