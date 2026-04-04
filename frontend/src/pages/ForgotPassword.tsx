import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 card">
          <div className="text-center">
            <svg className="mx-auto w-16 h-16 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
            <h2 className="mt-6 text-3xl font-bold text-navy">
              Check your email
            </h2>
            <p className="mt-4 text-surface-600">
              If an account exists for <span className="font-medium">{email}</span>, you'll receive a password reset link shortly.
            </p>
            <p className="mt-2 text-sm text-surface-500">
              Don't see it? Check your spam folder.
            </p>
          </div>

          <div className="space-y-4">
            <Link to="/login" className="w-full btn btn-primary block text-center">
              Return to sign in
            </Link>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setEmail('');
              }}
              className="w-full btn-secondary py-3"
            >
              Try a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 card">
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="mx-auto">
            <rect width="32" height="32" rx="10" fill="#1B2A4A"/>
            <circle cx="11" cy="12" r="2" fill="#4A7FB5"/>
            <circle cx="21" cy="12" r="2" fill="#4A7FB5"/>
            <circle cx="16" cy="16" r="1.5" fill="#4A7FB5"/>
            <path d="M9 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#4A7FB5" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h2 className="mt-6 text-3xl font-bold text-navy">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-surface-600">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-light border border-danger-light text-danger px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>

          <p className="text-center text-sm text-surface-600">
            Remember your password?{' '}
            <Link to="/login" className="text-steel hover:text-steel-dark font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
