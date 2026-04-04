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
    <div className="min-h-screen bg-surface">
      <nav className="py-3 bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
              <rect width="32" height="32" rx="10" fill="#1B2A4A"/>
              <circle cx="11" cy="12" r="2" fill="#4A7FB5"/>
              <circle cx="21" cy="12" r="2" fill="#4A7FB5"/>
              <circle cx="16" cy="16" r="1.5" fill="#4A7FB5"/>
              <path d="M9 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#4A7FB5" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="font-heading text-lg text-navy font-semibold">
              FureverCare
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium text-steel no-underline"
              >
                Admin
              </Link>
            )}
            <Link
              to="/settings"
              className="text-sm font-medium text-surface-600 no-underline"
            >
              {user?.name || 'Settings'}
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-surface-600 bg-transparent border-none cursor-pointer"
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
