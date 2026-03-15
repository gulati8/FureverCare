import { Link } from 'react-router-dom';
import { FooterContent } from '../../api/cms';

interface FooterProps {
  content: FooterContent;
}

export default function Footer({ content }: FooterProps) {
  const { links, copyright } = content;

  return (
    <footer style={{ background: 'var(--color-navy)', padding: '48px 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          {/* Logo and Copyright */}
          <div className="flex flex-col items-center md:items-start mb-8 md:mb-0">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="rgba(255,255,255,0.15)"/>
                <circle cx="11" cy="12" r="2" fill="#4A7FB5"/>
                <circle cx="21" cy="12" r="2" fill="#4A7FB5"/>
                <circle cx="16" cy="16" r="1.5" fill="#4A7FB5"/>
                <path d="M9 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#4A7FB5" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="text-xl font-bold text-white">FureverCare</span>
            </Link>
            <p className="text-sm" style={{ color: 'var(--color-surface-400)' }}>
              {copyright}
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-8">
            {links.map((link, index) => {
              const isInternal = link.url.startsWith('/');
              return isInternal ? (
                <Link
                  key={index}
                  to={link.url}
                  className="text-sm transition-colors"
                  style={{ color: 'var(--color-surface-400)', textDecoration: 'none' }}
                >
                  {link.text}
                </Link>
              ) : (
                <a
                  key={index}
                  href={link.url}
                  className="text-sm transition-colors"
                  style={{ color: 'var(--color-surface-400)', textDecoration: 'none' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.text}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-center text-sm" style={{ color: 'var(--color-surface-500)' }}>
            Made with care for pet parents everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
