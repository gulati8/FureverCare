import { Link } from 'react-router-dom';
import { HeroContent } from '../../api/cms';
import { useAuth } from '../../hooks/useAuth';

interface HeroProps {
  content: HeroContent;
}

export default function Hero({ content }: HeroProps) {
  const { headline, subheadline, cta_primary, cta_secondary } = content;
  const { user, openAuthModal } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-primary-50 via-white to-accent-50 pt-16 md:pt-20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              {headline}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0">
              {subheadline}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {user ? (
                <Link
                  to="/dashboard"
                  className="btn-accent px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => openAuthModal('signup')}
                  className="btn-accent px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  {cta_primary.text}
                </button>
              )}
              <button
                onClick={() => {
                  const targetId = cta_secondary.url.replace('#', '');
                  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn border-2 border-primary-500 text-primary-600 hover:bg-primary-50 px-8 py-4 text-lg font-semibold"
              >
                {cta_secondary.text}
              </button>
            </div>
          </div>

          {/* Illustration - Pet Card Preview */}
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              {/* Main Card */}
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-96 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                {/* Pet Header */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-[72px] h-[72px] bg-primary-200 rounded-full flex items-center justify-center text-4xl flex-shrink-0">
                    🐕
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Max</h3>
                    <p className="text-sm text-gray-500">Golden Retriever, 4 years old</p>
                  </div>
                </div>

                {/* Health Badges */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    Chicken Allergy
                  </span>
                  <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                    Hip Dysplasia
                  </span>
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    Carprofen
                  </span>
                </div>

                {/* QR Code Section */}
                <div className="flex items-center gap-4 pt-5 border-t border-gray-200">
                  <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-mono">QR</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-tight">
                    Scan to view full<br />emergency card
                  </p>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -left-4 bg-accent-400 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                Free to use!
              </div>

              {/* Secondary floating element */}
              <div className="absolute -bottom-6 -right-6 bg-primary-500 text-white p-3 rounded-xl shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer hover:text-primary-500 transition-colors"
        aria-label="Scroll to features"
      >
        <svg className="w-6 h-6 text-gray-400 hover:text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
    </section>
  );
}
