import { Link } from 'react-router-dom';
import { CTAContent } from '../../api/cms';
import { useAuth } from '../../hooks/useAuth';

interface CTASectionProps {
  content: CTAContent;
}

export default function CTASection({ content }: CTASectionProps) {
  const { headline, subheadline, button } = content;
  const { user, openAuthModal } = useAuth();

  return (
    <section className="relative py-20 md:py-28 bg-gradient-to-br from-primary-500 to-primary-700 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary-400 rounded-full opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary-800 rounded-full opacity-30 translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
          {headline}
        </h2>
        <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          {subheadline}
        </p>
        {user ? (
          <Link
            to="/dashboard"
            className="inline-block bg-accent-400 text-white hover:bg-accent-500 px-10 py-4 rounded-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Go to Dashboard
          </Link>
        ) : (
          <button
            onClick={() => openAuthModal('signup')}
            className="inline-block bg-accent-400 text-white hover:bg-accent-500 px-10 py-4 rounded-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {button.text}
          </button>
        )}
      </div>
    </section>
  );
}
