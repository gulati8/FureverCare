import { useState, useEffect } from 'react';
import { cmsApi, Page, Block, HeroContent, FeaturesContent, HowItWorksContent, CTAContent, FooterContent } from '../api/cms';
import Navigation from '../components/homepage/Navigation';
import Hero from '../components/homepage/Hero';
import Features from '../components/homepage/Features';
import HowItWorks from '../components/homepage/HowItWorks';
import CTASection from '../components/homepage/CTASection';
import Footer from '../components/homepage/Footer';
import AuthModal from '../components/AuthModal';

export default function Homepage() {
  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    try {
      const data = await cmsApi.fetchPage('homepage');
      setPage(data);
    } catch (err) {
      console.error('Failed to load homepage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setIsLoading(false);
    }
  };

  // Find block by type
  const findBlock = <T extends Block['content']>(type: string): T | null => {
    const block = page?.blocks.find(b => b.block_type === type && b.is_visible);
    return block ? (block.content as T) : null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-6">Sorry, we couldn't load this page. Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-2"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const heroContent = findBlock<HeroContent>('hero');
  const featuresContent = findBlock<FeaturesContent>('features');
  const howItWorksContent = findBlock<HowItWorksContent>('how_it_works');
  const ctaContent = findBlock<CTAContent>('cta');
  const footerContent = findBlock<FooterContent>('footer');

  return (
    <div className="min-h-screen">
      <Navigation />

      {heroContent && <Hero content={heroContent} />}
      {featuresContent && <Features content={featuresContent} />}
      {howItWorksContent && <HowItWorks content={howItWorksContent} />}
      {ctaContent && <CTASection content={ctaContent} />}
      {footerContent && <Footer content={footerContent} />}

      {/* Fallback footer if no CMS footer block */}
      {!footerContent && (
        <footer className="bg-gray-900 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400 text-sm">
              {new Date().getFullYear()} FureverCare. All rights reserved.
            </p>
          </div>
        </footer>
      )}

      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
}
