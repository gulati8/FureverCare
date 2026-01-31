import { useState } from 'react';

interface FooterLink {
  text: string;
  url: string;
}

interface FooterContent {
  links: FooterLink[];
  copyright: string;
}

interface FooterEditorProps {
  content: FooterContent;
  onChange: (content: FooterContent) => void;
}

export default function FooterEditor({ content, onChange }: FooterEditorProps) {
  const [newLink, setNewLink] = useState<FooterLink>({ text: '', url: '' });

  const links = content.links || [];

  const handleCopyrightChange = (value: string) => {
    onChange({ ...content, copyright: value });
  };

  const handleLinkChange = (index: number, field: 'text' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange({ ...content, links: newLinks });
  };

  const handleAddLink = () => {
    if (!newLink.text.trim() || !newLink.url.trim()) return;
    onChange({
      ...content,
      links: [...links, { ...newLink }],
    });
    setNewLink({ text: '', url: '' });
  };

  const handleRemoveLink = (index: number) => {
    onChange({
      ...content,
      links: links.filter((_, i) => i !== index),
    });
  };

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= links.length) return;

    const newLinks = [...links];
    [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];
    onChange({ ...content, links: newLinks });
  };

  return (
    <div className="space-y-6">
      {/* Copyright */}
      <div>
        <label className="label">Copyright Text</label>
        <input
          type="text"
          value={content.copyright || ''}
          onChange={(e) => handleCopyrightChange(e.target.value)}
          className="input"
          placeholder="2024 FureverCare. All rights reserved."
        />
      </div>

      {/* Links */}
      <div>
        <label className="label mb-3">Footer Links ({links.length})</label>

        {/* Existing links */}
        <div className="space-y-2 mb-4">
          {links.map((link, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleMoveLink(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveLink(index, 'down')}
                  disabled={index === links.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Link fields */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={link.text}
                  onChange={(e) => handleLinkChange(index, 'text', e.target.value)}
                  className="input text-sm"
                  placeholder="Link text"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                  className="input text-sm"
                  placeholder="/path"
                />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveLink(index)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}

          {links.length === 0 && (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg text-sm">
              No footer links yet. Add one below.
            </div>
          )}
        </div>

        {/* Add new link */}
        <div className="p-4 border border-dashed border-gray-300 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Link</h4>
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="label text-xs">Label</label>
              <input
                type="text"
                value={newLink.text}
                onChange={(e) => setNewLink({ ...newLink, text: e.target.value })}
                className="input text-sm"
                placeholder="About"
              />
            </div>
            <div className="flex-1">
              <label className="label text-xs">URL</label>
              <input
                type="text"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className="input text-sm"
                placeholder="/about"
              />
            </div>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!newLink.text.trim() || !newLink.url.trim()}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
