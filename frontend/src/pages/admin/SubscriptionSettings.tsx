import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  adminApi,
  SubscriptionPricing,
  SubscriptionTrial,
  SubscriptionStripe,
} from '../../api/admin';

export default function SubscriptionSettings() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [pricing, setPricing] = useState<SubscriptionPricing>({
    monthly_price_cents: 999,
    annual_price_cents: 9999,
    currency: 'usd',
  });

  const [trial, setTrial] = useState<SubscriptionTrial>({
    trial_days: 14,
    require_card: false,
  });

  const [stripe, setStripe] = useState<SubscriptionStripe>({
    price_id_monthly: '',
    price_id_annual: '',
    webhook_secret: '',
  });

  // Saving states
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingTrial, setSavingTrial] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);

  // Load config on mount
  useEffect(() => {
    if (!token) return;

    const loadConfig = async () => {
      try {
        const config = await adminApi.getSubscriptionConfig(token);
        setPricing(config.pricing);
        setTrial(config.trial);
        setStripe(config.stripe);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription config');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [token]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingPricing(true);
    setError(null);
    try {
      await adminApi.updatePricing(token, pricing);
      showSuccess('Pricing settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSaveTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingTrial(true);
    setError(null);
    try {
      await adminApi.updateTrial(token, trial);
      showSuccess('Trial settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trial settings');
    } finally {
      setSavingTrial(false);
    }
  };

  const handleSaveStripe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingStripe(true);
    setError(null);
    try {
      await adminApi.updateStripe(token, stripe);
      showSuccess('Stripe settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Stripe settings');
    } finally {
      setSavingStripe(false);
    }
  };

  // Format cents to dollars for display
  const formatCentsToDollars = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  // Parse dollars to cents for storage
  const parseDollarsToCents = (dollars: string): number => {
    const parsed = parseFloat(dollars);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Settings</h1>
        <p className="text-gray-600 mt-1">Manage pricing, trial periods, and Stripe configuration</p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </span>
          <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Pricing Section */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">Pricing</h2>
          <p className="text-sm text-gray-500 mt-1">Set subscription prices for monthly and annual plans</p>
        </div>
        <form onSubmit={handleSavePricing} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="monthly_price" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Price ($)
              </label>
              <input
                type="number"
                id="monthly_price"
                step="0.01"
                min="0"
                value={formatCentsToDollars(pricing.monthly_price_cents)}
                onChange={(e) =>
                  setPricing({ ...pricing, monthly_price_cents: parseDollarsToCents(e.target.value) })
                }
                className="input w-full"
                placeholder="9.99"
              />
              <p className="text-xs text-gray-500 mt-1">{pricing.monthly_price_cents} cents</p>
            </div>
            <div>
              <label htmlFor="annual_price" className="block text-sm font-medium text-gray-700 mb-1">
                Annual Price ($)
              </label>
              <input
                type="number"
                id="annual_price"
                step="0.01"
                min="0"
                value={formatCentsToDollars(pricing.annual_price_cents)}
                onChange={(e) =>
                  setPricing({ ...pricing, annual_price_cents: parseDollarsToCents(e.target.value) })
                }
                className="input w-full"
                placeholder="99.99"
              />
              <p className="text-xs text-gray-500 mt-1">{pricing.annual_price_cents} cents</p>
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                id="currency"
                value={pricing.currency}
                onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}
                className="input w-full"
              >
                <option value="usd">USD - US Dollar</option>
                <option value="eur">EUR - Euro</option>
                <option value="gbp">GBP - British Pound</option>
                <option value="cad">CAD - Canadian Dollar</option>
                <option value="aud">AUD - Australian Dollar</option>
              </select>
            </div>
          </div>
          <div className="pt-4">
            <button type="submit" disabled={savingPricing} className="btn-primary flex items-center">
              {savingPricing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Pricing
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Trial Section */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">Trial Period</h2>
          <p className="text-sm text-gray-500 mt-1">Configure free trial settings for new users</p>
        </div>
        <form onSubmit={handleSaveTrial} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trial_days" className="block text-sm font-medium text-gray-700 mb-1">
                Trial Days
              </label>
              <input
                type="number"
                id="trial_days"
                min="0"
                max="365"
                value={trial.trial_days}
                onChange={(e) => setTrial({ ...trial, trial_days: parseInt(e.target.value) || 0 })}
                className="input w-full"
                placeholder="14"
              />
              <p className="text-xs text-gray-500 mt-1">Number of days for free trial (0 to disable)</p>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={trial.require_card}
                  onChange={(e) => setTrial({ ...trial, require_card: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-3">
                  <span className="text-sm font-medium text-gray-700">Require card for trial</span>
                  <p className="text-xs text-gray-500">Users must enter payment info to start trial</p>
                </span>
              </label>
            </div>
          </div>
          <div className="pt-4">
            <button type="submit" disabled={savingTrial} className="btn-primary flex items-center">
              {savingTrial ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Trial Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Stripe Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">Stripe Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Connect your Stripe price IDs and webhook secret</p>
        </div>
        <form onSubmit={handleSaveStripe} className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="price_id_monthly" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Price ID
              </label>
              <input
                type="text"
                id="price_id_monthly"
                value={stripe.price_id_monthly}
                onChange={(e) => setStripe({ ...stripe, price_id_monthly: e.target.value })}
                className="input w-full font-mono text-sm"
                placeholder="price_1A2B3C4D5E6F7G8H9I0J"
              />
              <p className="text-xs text-gray-500 mt-1">Find this in your Stripe dashboard under Products</p>
            </div>
            <div>
              <label htmlFor="price_id_annual" className="block text-sm font-medium text-gray-700 mb-1">
                Annual Price ID
              </label>
              <input
                type="text"
                id="price_id_annual"
                value={stripe.price_id_annual}
                onChange={(e) => setStripe({ ...stripe, price_id_annual: e.target.value })}
                className="input w-full font-mono text-sm"
                placeholder="price_1A2B3C4D5E6F7G8H9I0J"
              />
            </div>
            <div>
              <label htmlFor="webhook_secret" className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret
              </label>
              <input
                type="password"
                id="webhook_secret"
                value={stripe.webhook_secret}
                onChange={(e) => setStripe({ ...stripe, webhook_secret: e.target.value })}
                className="input w-full font-mono text-sm"
                placeholder="whsec_..."
              />
              <p className="text-xs text-gray-500 mt-1">Find this in Stripe Webhooks settings</p>
            </div>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button type="submit" disabled={savingStripe} className="btn-primary flex items-center">
              {savingStripe ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Stripe Settings
                </>
              )}
            </button>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              Open Stripe Dashboard
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
