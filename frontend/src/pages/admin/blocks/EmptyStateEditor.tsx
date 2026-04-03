interface EmptyStateContent {
  heading: string;
  subheading: string;
}

interface EmptyStateEditorProps {
  content: EmptyStateContent;
  onChange: (content: EmptyStateContent) => void;
}

export default function EmptyStateEditor({ content, onChange }: EmptyStateEditorProps) {
  const handleChange = (field: 'heading' | 'subheading', value: string) => {
    onChange({ ...content, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <label className="label">Heading</label>
        <input
          type="text"
          value={content.heading || ''}
          onChange={(e) => handleChange('heading', e.target.value)}
          className="input"
          placeholder="Add your first pet to create their profile"
          required
        />
      </div>

      {/* Subheading */}
      <div>
        <label className="label">Subheading</label>
        <input
          type="text"
          value={content.subheading || ''}
          onChange={(e) => handleChange('subheading', e.target.value)}
          className="input"
          placeholder="Optional supporting text"
        />
      </div>
    </div>
  );
}
