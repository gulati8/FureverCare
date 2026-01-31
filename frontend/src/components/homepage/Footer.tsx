import { Link } from 'react-router-dom';
import { FooterContent } from '../../api/cms';

interface FooterProps {
  content: FooterContent;
}

export default function Footer({ content }: FooterProps) {
  const { links, copyright } = content;

  return (
    <footer className="bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          {/* Logo and Copyright */}
          <div className="flex flex-col items-center md:items-start mb-8 md:mb-0">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <svg className="w-8 h-8 text-primary-400" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="45" />
                <path d="M30 35 Q35 25 45 30 Q50 20 55 30 Q65 25 70 35 Q75 45 65 50 Q70 60 60 65 Q55 75 50 70 Q45 75 40 65 Q30 60 35 50 Q25 45 30 35" fill="#1f2937"/>
              </svg>
              <span className="text-xl font-bold text-white">FureverCare</span>
            </Link>
            <p className="text-gray-400 text-sm">
              {copyright}
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-8">
            {links.map((link, index) => {
              // Use Link for internal routes, anchor for external
              const isInternal = link.url.startsWith('/');
              return isInternal ? (
                <Link
                  key={index}
                  to={link.url}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  {link.text}
                </Link>
              ) : (
                <a
                  key={index}
                  href={link.url}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.text}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <p className="text-center text-gray-500 text-sm">
            Made with care for pet parents everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
