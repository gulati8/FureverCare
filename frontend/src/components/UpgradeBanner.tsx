import { Link } from 'react-router-dom';

interface UpgradeBannerProps {
  type: 'pet_limit' | 'feature';
  feature?: 'upload' | 'timeline' | 'shared_ownership';
  petCount?: number;
  petLimit?: number;
}

const featureMessages: Record<string, string> = {
  upload: 'Document upload is a premium feature.',
  timeline: 'Timeline view is a premium feature.',
  shared_ownership: 'Sharing pets with others is a premium feature.',
};

export default function UpgradeBanner({ type, feature, petCount, petLimit }: UpgradeBannerProps) {
  const getMessage = () => {
    if (type === 'pet_limit') {
      return `You've reached your pet limit (${petCount}/${petLimit}). Upgrade to add more pets.`;
    }
    if (type === 'feature' && feature) {
      return featureMessages[feature] || 'This is a premium feature.';
    }
    return 'Upgrade to unlock premium features.';
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-accent-400 to-accent-500 p-4 shadow-lg">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="upgrade-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2" fill="white" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#upgrade-pattern)" />
        </svg>
      </div>

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Star/Crown icon for premium */}
          <div className="flex-shrink-0 rounded-full bg-white/20 p-2">
            <svg
              className="h-5 w-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>

          <p className="text-sm font-medium text-white sm:text-base">
            {getMessage()}
          </p>
        </div>

        <Link
          to="/pricing"
          className="flex-shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-accent-500 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
