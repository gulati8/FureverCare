import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { billingApi, PaymentMethod } from '../api/billing';
import AddPaymentMethodModal from './AddPaymentMethodModal';

export default function PaymentMethodList() {
  const { token } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadMethods = useCallback(async () => {
    if (!token) return;
    try {
      const data = await billingApi.getPaymentMethods(token);
      setMethods(data);
    } catch {
      setError('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const handleSetDefault = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    setError('');
    try {
      await billingApi.setDefaultPaymentMethod(token, id);
      await loadMethods();
    } catch {
      setError('Failed to set default payment method');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    setError('');
    try {
      await billingApi.removePaymentMethod(token, id);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('Failed to remove payment method');
    } finally {
      setActionLoading(null);
    }
  };

  const formatMethod = (method: PaymentMethod) => {
    if (method.card) {
      const { brand, last4, exp_month, exp_year } = method.card;
      return `${brand.charAt(0).toUpperCase() + brand.slice(1)} ending in ${last4} (${exp_month}/${exp_year})`;
    }
    if (method.paypal) {
      return `PayPal - ${method.paypal.email}`;
    }
    return `${method.type}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-gray-900">Payment Methods</h3>
        <button onClick={() => setShowAddModal(true)} className="text-sm text-primary-600 hover:text-primary-500 font-medium">
          Add method
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {methods.length === 0 ? (
        <p className="text-gray-500 text-sm">No payment methods on file.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {methods.map((method) => (
            <li key={method.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-900">{formatMethod(method)}</span>
                {method.isDefault && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    disabled={actionLoading === method.id}
                    className="text-xs text-primary-600 hover:text-primary-500 font-medium disabled:opacity-50"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => handleRemove(method.id)}
                  disabled={actionLoading === method.id}
                  className="text-xs text-red-600 hover:text-red-500 font-medium disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAddModal && (
        <AddPaymentMethodModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            loadMethods();
          }}
        />
      )}
    </div>
  );
}
