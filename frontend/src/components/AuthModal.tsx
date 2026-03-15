import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthModal() {
  const { authModal, closeAuthModal, openAuthModal, login, register } = useAuth();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authModal) {
      setError('');
      setLoginEmail('');
      setLoginPassword('');
      setSignupName('');
      setSignupEmail('');
      setSignupPhone('');
      setSignupPassword('');
      setSignupConfirmPassword('');
    }
  }, [authModal]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    if (authModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [authModal, closeAuthModal]);

  if (!authModal) return null;

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { isAdmin } = await login(loginEmail, loginPassword);
      closeAuthModal();
      navigate(isAdmin ? '/admin/analytics' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register(signupEmail, signupPassword, signupName, signupPhone || undefined);
      closeAuthModal();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const isLogin = authModal === 'login';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ background: 'rgba(27,42,74,0.5)' }}
        onClick={closeAuthModal}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md p-8 transform transition-all"
          style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-surface-400)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="mx-auto">
              <rect width="32" height="32" rx="10" fill="#1B2A4A"/>
              <circle cx="11" cy="12" r="2" fill="#4A7FB5"/>
              <circle cx="21" cy="12" r="2" fill="#4A7FB5"/>
              <circle cx="16" cy="16" r="1.5" fill="#4A7FB5"/>
              <path d="M9 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#4A7FB5" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2 className="mt-4 text-2xl" style={{ color: 'var(--color-navy)', fontWeight: 700 }}>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-surface-600)' }}>
              {isLogin
                ? 'Sign in to access your pet health dashboard'
                : "Start protecting your pet's health information today"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: '16px', background: 'var(--color-danger-light)',
              border: '1px solid #F5C6CB', padding: '12px 16px',
              borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
              color: 'var(--color-danger)',
            }}>
              {error}
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="label">Email address</label>
                <input id="login-email" name="email" type="email" autoComplete="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="input" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="login-password" className="label">Password</label>
                <input id="login-password" name="password" type="password" autoComplete="current-password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="input" placeholder="Enter your password" />
              </div>
              <div className="flex items-center justify-end">
                <a href="/forgot-password" className="text-sm font-medium" style={{ color: 'var(--color-steel)' }}>Forgot your password?</a>
              </div>
              <button type="submit" disabled={isLoading} className="w-full btn btn-primary" style={{ padding: '12px' }}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label htmlFor="signup-name" className="label">Your name</label>
                <input id="signup-name" name="name" type="text" required value={signupName} onChange={(e) => setSignupName(e.target.value)} className="input" placeholder="John Doe" />
              </div>
              <div>
                <label htmlFor="signup-email" className="label">Email address</label>
                <input id="signup-email" name="email" type="email" autoComplete="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="input" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="signup-phone" className="label">Phone number (optional)</label>
                <input id="signup-phone" name="phone" type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="input" placeholder="(555) 123-4567" />
              </div>
              <div>
                <label htmlFor="signup-password" className="label">Password</label>
                <input id="signup-password" name="password" type="password" required value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="input" placeholder="At least 8 characters" />
              </div>
              <div>
                <label htmlFor="signup-confirm-password" className="label">Confirm password</label>
                <input id="signup-confirm-password" name="confirmPassword" type="password" required value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} className="input" placeholder="Confirm your password" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full btn btn-primary" style={{ padding: '12px' }}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          {/* Toggle */}
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-surface-600)' }}>
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <button type="button" onClick={() => { setError(''); openAuthModal('signup'); }} className="font-medium" style={{ color: 'var(--color-steel)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => { setError(''); openAuthModal('login'); }} className="font-medium" style={{ color: 'var(--color-steel)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
