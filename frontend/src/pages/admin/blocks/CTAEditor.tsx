interface CTAContent {
  headline: string;
  subheadline: string;
  button: {
    text: string;
    url: string;
  };
}

interface CTAEditorProps {
  content: CTAContent;
  onChange: (content: CTAContent) => void;
}

export default function CTAEditor({ content, onChange }: CTAEditorProps) {
  const handleChange = (field: 'headline' | 'subheadline', value: string) => {
    onChange({ ...content, [field]: value });
  };

  const handleButtonChange = (field: 'text' | 'url', value: string) => {
    onChange({
      ...content,
      button: {
        ...content.button,
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
          placeholder="Ready to get started?"
        />
      </div>

      {/* Subheadline */}
      <div>
        <label className="label">Subheadline</label>
        <textarea
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="input"
          rows={2}
          placeholder="Join thousands of pet owners who trust our platform"
        />
      </div>

      {/* Button */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Call to Action Button</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Button Text</label>
            <input
              type="text"
              value={content.button?.text || ''}
              onChange={(e) => handleButtonChange('text', e.target.value)}
              className="input"
              placeholder="Start Free Today"
            />
          </div>
          <div>
            <label className="label">Button Link</label>
            <input
              type="text"
              value={content.button?.url || ''}
              onChange={(e) => handleButtonChange('url', e.target.value)}
              className="input"
              placeholder="/register"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
