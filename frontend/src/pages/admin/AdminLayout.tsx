import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-primary-800 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out lg:transform-none lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo and close button */}
        <div className="p-4 border-b border-primary-700 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center space-x-2" onClick={closeSidebar}>
            <svg className="w-8 h-8 text-white" viewBox="0 0 100 100" fill="currentColor">
              <circle cx="50" cy="50" r="45" />
              <path d="M30 35 Q35 25 45 30 Q50 20 55 30 Q65 25 70 35 Q75 45 65 50 Q70 60 60 65 Q55 75 50 70 Q45 75 40 65 Q30 60 35 50 Q25 45 30 35" fill="#166534"/>
            </svg>
            <span className="text-lg font-bold">FureverCare</span>
          </Link>
          {/* Close button for mobile */}
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1 rounded-lg hover:bg-primary-700 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <Link
              to="/admin/analytics"
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/analytics')
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </Link>
            <Link
              to="/admin/users"
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/users')
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Users</span>
            </Link>
            <Link
              to="/admin/pets"
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/pets')
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Pets</span>
            </Link>
            <Link
              to="/admin/cms"
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/cms')
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>CMS</span>
            </Link>
            <Link
              to="/admin/subscriptions"
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/subscriptions')
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Subscriptions</span>
            </Link>
          </div>
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-primary-700">
          <Link
            to="/dashboard"
            onClick={closeSidebar}
            className="flex items-center space-x-3 px-3 py-2 text-primary-200 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {/* Hamburger menu button for mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-primary-100 text-primary-800">
                Admin
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-gray-600 text-sm sm:text-base hidden sm:inline">Hi, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 text-sm sm:text-base"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
