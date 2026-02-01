import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-primary-500" viewBox="0 0 100 100" fill="currentColor">
              <circle cx="50" cy="50" r="45" />
              <path d="M30 35 Q35 25 45 30 Q50 20 55 30 Q65 25 70 35 Q75 45 65 50 Q70 60 60 65 Q55 75 50 70 Q45 75 40 65 Q30 60 35 50 Q25 45 30 35" fill="white"/>
            </svg>
            <span className={`text-xl md:text-2xl font-bold ${isScrolled ? 'text-primary-600' : 'text-primary-600'}`}>
              FureverCare
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className={`font-medium transition-colors ${
                isScrolled ? 'text-gray-700 hover:text-primary-600' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className={`font-medium transition-colors ${
                isScrolled ? 'text-gray-700 hover:text-primary-600' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              How It Works
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <Link
                to="/dashboard"
                className="btn-accent px-6 py-2"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('login')}
                  className={`font-medium px-4 py-2 transition-colors ${
                    isScrolled ? 'text-gray-700 hover:text-primary-600' : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="btn-accent px-6 py-2"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="flex flex-col space-y-4">
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-2 text-gray-700 hover:text-primary-600 font-medium"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-2 text-gray-700 hover:text-primary-600 font-medium"
              >
                How It Works
              </a>
              <hr className="my-2" />
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mx-4 btn-accent text-center py-3"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-primary-600 font-medium text-left"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuthModal('signup');
                    }}
                    className="mx-4 btn-accent text-center py-3"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
