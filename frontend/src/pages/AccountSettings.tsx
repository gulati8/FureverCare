import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/client';

export default function AccountSettings() {
  const { user, token, subscription, refreshProfile } = useAuth();

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setProfileError('');
    setProfileSuccess('');
    setIsSavingProfile(true);

    try {
      await authApi.updateProfile({ name, phone: phone || undefined }, token);
      await refreshProfile();
      setProfileSuccess('Profile updated successfully');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsSavingPassword(true);

    try {
      await authApi.changePassword({ currentPassword, newPassword }, token);
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const getSubscriptionDisplay = () => {
    if (!subscription || subscription.tier === 'free') {
      return { tier: 'Free', status: null };
    }
    return {
      tier: 'Premium',
      status: subscription.status,
    };
  };

  const subscriptionInfo = getSubscriptionDisplay();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        <span className="sep">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </span>
        <span className="current">Account Settings</span>
      </div>
      <h1 className="page-title mb-8">Account Settings</h1>

      {/* Profile Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Profile Information</h2>

        {profileError && (
          <div className="mb-4 bg-danger-light border border-danger-light text-danger px-4 py-3 rounded-lg">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="mb-4 bg-success-light border border-success-light text-success px-4 py-3 rounded-lg">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={user?.email || ''}
              disabled
              className="input w-full bg-surface-100 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-surface-500">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-surface-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-surface-700 mb-1">
              Phone (optional)
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="btn-primary"
          >
            {isSavingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Change Password</h2>

        {passwordError && (
          <div className="mb-4 bg-danger-light border border-danger-light text-danger px-4 py-3 rounded-lg">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 bg-success-light border border-success-light text-success px-4 py-3 rounded-lg">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-surface-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-surface-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input w-full"
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input w-full"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isSavingPassword}
            className="btn-primary"
          >
            {isSavingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Subscription Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-navy mb-4">Subscription</h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-surface-200">
            <span className="text-surface-600">Current Plan</span>
            <span className="font-medium text-navy">{subscriptionInfo.tier}</span>
          </div>

          {subscriptionInfo.status && (
            <div className="flex justify-between items-center py-2 border-b border-surface-200">
              <span className="text-surface-600">Status</span>
              <span>
                {subscriptionInfo.status === 'active' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">Active</span>
                )}
                {subscriptionInfo.status === 'trialing' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-light text-info">Trial</span>
                )}
                {subscriptionInfo.status === 'past_due' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning-dark">Past Due</span>
                )}
                {subscriptionInfo.status === 'canceled' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-light text-danger">Canceled</span>
                )}
              </span>
            </div>
          )}

          {subscription?.currentPeriodEnd && (
            <div className="flex justify-between items-center py-2 border-b border-surface-200">
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

        <div className="mt-4">
          <Link to="/billing" className="btn btn-secondary inline-flex">
            Manage Subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
