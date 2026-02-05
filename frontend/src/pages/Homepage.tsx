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

  const heroContent = findBlock<HeroContent>('hero');
  const featuresContent = findBlock<FeaturesContent>('features');
  const howItWorksContent = findBlock<HowItWorksContent>('how_it_works');
  const ctaContent = findBlock<CTAContent>('cta');
  const footerContent = findBlock<FooterContent>('footer');

  // Default hero content for immediate display while CMS loads
  const defaultHeroContent: HeroContent = {
    headline: "Your Pet's Emergency Info, Always Ready",
    subheadline: "Create digital emergency health cards for your pets. Share vital information instantly with vets, pet sitters, or anyone who needs it.",
    cta_primary: { text: "Get Started Free", url: "/signup" },
    cta_secondary: { text: "Learn More", url: "#features" }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation always visible immediately */}
      <Navigation />

      {/* Hero section - show immediately with default or CMS content */}
      <Hero content={heroContent || defaultHeroContent} />

      {/* Progressive loading for below-fold content */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="py-20 text-center max-w-md mx-auto px-4">
          <p className="text-gray-600 mb-4">Some content couldn't be loaded.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-2"
          >
            Refresh Page
          </button>
        </div>
      ) : (
        <>
          {featuresContent && <Features content={featuresContent} />}
          {howItWorksContent && <HowItWorks content={howItWorksContent} />}
          {ctaContent && <CTASection content={ctaContent} />}
          {footerContent && <Footer content={footerContent} />}
        </>
      )}

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
