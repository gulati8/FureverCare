import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Cog6ToothIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <svg className="w-8 h-8 text-primary-600" viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="50" cy="50" r="45" />
                  <path d="M30 35 Q35 25 45 30 Q50 20 55 30 Q65 25 70 35 Q75 45 65 50 Q70 60 60 65 Q55 75 50 70 Q45 75 40 65 Q30 60 35 50 Q25 45 30 35" fill="white"/>
                </svg>
                <span className="text-xl font-bold text-gray-900">FureverCare</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                  <span>Admin</span>
                </Link>
              )}
              <Link
                to="/settings"
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
              >
                <UserCircleIcon className="w-5 h-5" />
                <span>{user?.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
