import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <nav style={{ padding: '12px 0', background: 'var(--color-white)', borderBottom: '1px solid var(--color-surface-200)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
              <rect width="32" height="32" rx="10" fill="#1B2A4A"/>
              <circle cx="11" cy="12" r="2" fill="#4A7FB5"/>
              <circle cx="21" cy="12" r="2" fill="#4A7FB5"/>
              <circle cx="16" cy="16" r="1.5" fill="#4A7FB5"/>
              <path d="M9 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#4A7FB5" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', color: 'var(--color-navy)', fontWeight: 600 }}>
              FureverCare
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium"
                style={{ color: 'var(--color-steel)', textDecoration: 'none' }}
              >
                Admin
              </Link>
            )}
            <Link
              to="/settings"
              className="text-sm font-medium"
              style={{ color: 'var(--color-surface-600)', textDecoration: 'none' }}
            >
              {user?.name || 'Settings'}
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-medium"
              style={{ color: 'var(--color-surface-600)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
