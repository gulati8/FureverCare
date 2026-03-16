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
    <section
      className="relative min-h-screen flex items-center pt-16 md:pt-20"
      style={{ background: 'linear-gradient(180deg, var(--color-navy-50) 0%, var(--color-white) 40%)' }}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left fade-in-up">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl leading-tight"
              style={{ color: 'var(--color-navy)', fontWeight: 700, lineHeight: 1.15 }}
            >
              {headline}
            </h1>
            <p className="mt-6 text-lg md:text-xl max-w-xl mx-auto lg:mx-0" style={{ color: 'var(--color-surface-600)', lineHeight: 1.7 }}>
              {subheadline}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {user ? (
                <Link to="/dashboard" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                  Go to Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => openAuthModal('signup')}
                  className="btn btn-primary"
                  style={{ padding: '14px 32px', fontSize: '1rem' }}
                >
                  {cta_primary.text}
                </button>
              )}
              <button
                onClick={() => {
                  const targetId = cta_secondary.url.replace('#', '');
                  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn btn-secondary"
              >
                {cta_secondary.text}
              </button>
            </div>
          </div>

          {/* Emergency Card Preview */}
          <div className="hidden lg:flex justify-center fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-surface-200)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
                maxWidth: '400px',
                width: '100%',
              }}
            >
              {/* Card header */}
              <div style={{ background: 'var(--color-danger)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                  Emergency Pet Card
                </span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="9" y="2" width="6" height="20" rx="2"/><rect x="2" y="9" width="20" height="6" rx="2"/></svg>
              </div>
              {/* Card body */}
              <div style={{ padding: '20px' }}>
                <div className="flex items-center gap-4" style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      background: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#4A7FB5">
                      <path d="M12 2C9.24 2 7 4.24 7 7c0 1.38.56 2.63 1.46 3.54C7.56 11.37 7 12.62 7 14v4c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-4c0-1.38-.56-2.63-1.46-3.46C16.44 9.63 17 8.38 17 7c0-2.76-2.24-5-5-5zm-2 6a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600 }}>Max</div>
                    <div className="text-sm" style={{ color: 'var(--color-surface-500)' }}>Golden Retriever &bull; 4 years &bull; Male</div>
                  </div>
                </div>
                {/* Health badges */}
                <div className="flex flex-wrap gap-1.5" style={{ marginBottom: '16px' }}>
                  <span className="badge badge-danger">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                    Chicken Allergy
                  </span>
                  <span className="badge badge-warning">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    Hip Dysplasia
                  </span>
                  <span className="badge badge-info">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    Carprofen
                  </span>
                </div>
                <div style={{ borderTop: '1px solid var(--color-surface-200)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--color-surface-500)', marginBottom: '2px' }}>Emergency Contact</div>
                    <div className="text-sm font-medium">Amit Gulati &bull; (555) 123-4567</div>
                  </div>
                  <div
                    style={{
                      width: '56px', height: '56px', background: 'var(--color-surface-100)',
                      border: '1px solid var(--color-surface-200)', borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--color-surface-400)">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/>
                      <rect x="18" y="18" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/>
                      <rect x="18" y="14" width="3" height="3"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 transition-transform duration-300 hover:-translate-y-1"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Scroll to features"
      >
        <svg className="w-6 h-6" style={{ color: 'var(--color-surface-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
    </section>
  );
}
