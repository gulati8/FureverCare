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
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: isScrolled ? 'var(--color-white)' : 'transparent',
        borderBottom: isScrolled ? '1px solid var(--color-surface-200)' : '1px solid transparent',
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
              <rect width="32" height="32" rx="10" fill="#1B2A4A"/>
              <circle cx="11" cy="12" r="2" fill="#4A7FB5"/>
              <circle cx="21" cy="12" r="2" fill="#4A7FB5"/>
              <circle cx="16" cy="16" r="1.5" fill="#4A7FB5"/>
              <path d="M9 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#4A7FB5" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: 'var(--color-navy)', fontWeight: 600 }}>
              FureverCare
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <a
              href="#features"
              className="font-medium transition-colors text-sm"
              style={{ color: 'var(--color-surface-600)', textDecoration: 'none' }}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="font-medium transition-colors text-sm"
              style={{ color: 'var(--color-surface-600)', textDecoration: 'none' }}
            >
              How It Works
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('login')}
                  className="btn btn-ghost btn-sm"
                >
                  Log In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="btn btn-primary btn-sm"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--color-surface-700)' }}
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
          <div className="md:hidden py-4" style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-surface-100)' }}>
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-2 font-medium"
                style={{ color: 'var(--color-surface-700)', textDecoration: 'none' }}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-2 font-medium"
                style={{ color: 'var(--color-surface-700)', textDecoration: 'none' }}
              >
                How It Works
              </a>
              <hr style={{ borderColor: 'var(--color-surface-200)' }} />
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mx-4 btn btn-primary text-center"
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
                    className="px-4 py-2 font-medium text-left"
                    style={{ color: 'var(--color-surface-700)', background: 'none', border: 'none' }}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuthModal('signup');
                    }}
                    className="mx-4 btn btn-primary text-center"
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
