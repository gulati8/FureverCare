interface HeroContent {
  headline: string;
  subheadline: string;
  cta_primary: {
    text: string;
    url: string;
  };
  cta_secondary: {
    text: string;
    url: string;
  };
}

interface HeroEditorProps {
  content: HeroContent;
  onChange: (content: HeroContent) => void;
}

export default function HeroEditor({ content, onChange }: HeroEditorProps) {
  const handleChange = (field: keyof HeroContent, value: string) => {
    onChange({ ...content, [field]: value });
  };

  const handleCtaChange = (
    ctaType: 'cta_primary' | 'cta_secondary',
    field: 'text' | 'url',
    value: string
  ) => {
    onChange({
      ...content,
      [ctaType]: {
        ...content[ctaType],
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div>
        <label className="label">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="input"
          placeholder="Your main headline..."
        />
      </div>

      {/* Subheadline */}
      <div>
        <label className="label">Subheadline</label>
        <textarea
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="input"
          rows={3}
          placeholder="Supporting text that explains your value proposition..."
        />
      </div>

      {/* Primary CTA */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Primary Button</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Button Text</label>
            <input
              type="text"
              value={content.cta_primary?.text || ''}
              onChange={(e) => handleCtaChange('cta_primary', 'text', e.target.value)}
              className="input"
              placeholder="Get Started"
            />
          </div>
          <div>
            <label className="label">Button Link</label>
            <input
              type="text"
              value={content.cta_primary?.url || ''}
              onChange={(e) => handleCtaChange('cta_primary', 'url', e.target.value)}
              className="input"
              placeholder="/register"
            />
          </div>
        </div>
      </div>

      {/* Secondary CTA */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Secondary Button</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Button Text</label>
            <input
              type="text"
              value={content.cta_secondary?.text || ''}
              onChange={(e) => handleCtaChange('cta_secondary', 'text', e.target.value)}
              className="input"
              placeholder="Learn More"
            />
          </div>
          <div>
            <label className="label">Button Link</label>
            <input
              type="text"
              value={content.cta_secondary?.url || ''}
              onChange={(e) => handleCtaChange('cta_secondary', 'url', e.target.value)}
              className="input"
              placeholder="#how-it-works"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
