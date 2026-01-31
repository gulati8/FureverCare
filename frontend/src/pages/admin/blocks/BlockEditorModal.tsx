import { useState } from 'react';
import { Block, BlockContent } from '../../../api/cms';
import HeroEditor from './HeroEditor';
import FeaturesEditor from './FeaturesEditor';
import HowItWorksEditor from './HowItWorksEditor';
import CTAEditor from './CTAEditor';
import FooterEditor from './FooterEditor';

interface BlockEditorModalProps {
  block: Block;
  onSave: (blockId: number, content: BlockContent) => Promise<void>;
  onClose: () => void;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  hero: 'Hero Section',
  features: 'Features Section',
  how_it_works: 'How It Works Section',
  cta: 'Call to Action Section',
  footer: 'Footer Section',
};

export default function BlockEditorModal({ block, onSave, onClose }: BlockEditorModalProps) {
  const [content, setContent] = useState<BlockContent>(block.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(block.id, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditor = () => {
    // Type-safe content handler that preserves the block's content type
    const handleContentChange = (newContent: BlockContent) => setContent(newContent);

    switch (block.block_type) {
      case 'hero':
        return <HeroEditor content={content as any} onChange={handleContentChange as any} />;
      case 'features':
        return <FeaturesEditor content={content as any} onChange={handleContentChange as any} />;
      case 'how_it_works':
        return <HowItWorksEditor content={content as any} onChange={handleContentChange as any} />;
      case 'cta':
        return <CTAEditor content={content as any} onChange={handleContentChange as any} />;
      case 'footer':
        return <FooterEditor content={content as any} onChange={handleContentChange as any} />;
      default:
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No editor available for block type: {block.block_type}</p>
            <pre className="mt-4 text-xs text-gray-600 overflow-auto">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Edit {BLOCK_TYPE_LABELS[block.block_type] || block.block_type}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {renderEditor()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
