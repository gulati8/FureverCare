import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { isAdmin } = await login(email, password);
      navigate(isAdmin ? '/admin/analytics' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

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
            Sign in to FureverCare
          </h2>
          <p className="mt-2 text-sm text-surface-600">
            Keep your pet's health info safe and shareable
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-light border border-danger-light text-danger px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
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

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm text-steel hover:text-steel-dark">
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-surface-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-steel hover:text-steel-dark font-medium">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
