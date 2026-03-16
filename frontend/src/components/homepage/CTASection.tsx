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
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-light) 100%)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 -translate-x-1/2 -translate-y-1/2" style={{ background: 'var(--color-steel)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10 translate-x-1/3 translate-y-1/3" style={{ background: 'var(--color-steel)' }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl text-white mb-6" style={{ fontWeight: 700 }}>
          {headline}
        </h2>
        <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          {subheadline}
        </p>
        {user ? (
          <Link
            to="/dashboard"
            className="btn btn-coral"
            style={{ padding: '16px 40px', fontSize: '1.1rem' }}
          >
            Go to Dashboard
          </Link>
        ) : (
          <button
            onClick={() => openAuthModal('signup')}
            className="btn btn-coral"
            style={{ padding: '16px 40px', fontSize: '1.1rem' }}
          >
            {button.text}
          </button>
        )}
      </div>
    </section>
  );
}
