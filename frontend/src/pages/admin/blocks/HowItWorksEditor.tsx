import { useState } from 'react';

interface Step {
  number: number;
  title: string;
  description: string;
}

interface HowItWorksContent {
  title: string;
  subtitle: string;
  steps: Step[];
}

interface HowItWorksEditorProps {
  content: HowItWorksContent;
  onChange: (content: HowItWorksContent) => void;
}

export default function HowItWorksEditor({ content, onChange }: HowItWorksEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleTitleChange = (value: string) => {
    onChange({ ...content, title: value });
  };

  const handleSubtitleChange = (value: string) => {
    onChange({ ...content, subtitle: value });
  };

  const handleStepChange = (index: number, field: 'title' | 'description', value: string) => {
    const newSteps = [...content.steps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: value,
      number: index + 1, // Auto-assign step number
    };
    onChange({ ...content, steps: newSteps });
  };

  const steps = content.steps || [];

  return (
    <div className="space-y-6">
      {/* Section title and subtitle */}
      <div>
        <label className="label">Section Title</label>
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="input"
          placeholder="How It Works"
        />
      </div>

      <div>
        <label className="label">Section Subtitle</label>
        <input
          type="text"
          value={content.subtitle || ''}
          onChange={(e) => handleSubtitleChange(e.target.value)}
          className="input"
          placeholder="Get started in minutes"
        />
      </div>

      {/* Steps list */}
      <div>
        <label className="label mb-3">Steps ({steps.length})</label>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="border border-surface-200 rounded-lg overflow-hidden"
            >
              {/* Step header - always visible */}
              <div
                className="px-4 py-3 bg-surface flex items-center justify-between cursor-pointer hover:bg-surface-100"
                onClick={() => setEditingIndex(editingIndex === index ? null : index)}
              >
                <div className="flex items-center space-x-3">
                  <span className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-navy">
                    {step.title || 'Untitled Step'}
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-surface-400 transition-transform ${
                    editingIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Step editor - expandable */}
              {editingIndex === index && (
                <div className="p-4 space-y-4 border-t border-surface-200">
                  <div>
                    <label className="label">Step Title</label>
                    <input
                      type="text"
                      value={step.title || ''}
                      onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                      className="input"
                      placeholder="Create Account"
                    />
                  </div>

                  <div>
                    <label className="label">Step Description</label>
                    <textarea
                      value={step.description || ''}
                      onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                      className="input"
                      rows={2}
                      placeholder="Brief description of this step..."
                    />
                  </div>

                  <p className="text-xs text-surface-500">
                    Step number is auto-assigned based on order.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {steps.length === 0 && (
          <div className="text-center py-8 text-surface-500 bg-surface rounded-lg">
            No steps defined yet.
          </div>
        )}
      </div>
    </div>
  );
}
