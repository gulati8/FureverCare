import { useState } from 'react';

interface FieldEditorProps {
  label: string;
  value: string | number | boolean | null | undefined;
  fieldKey: string;
  type?: 'text' | 'date' | 'boolean' | 'select';
  options?: { value: string; label: string }[];
  onChange: (key: string, value: any) => void;
  isModified?: boolean;
}

export function FieldEditor({
  label,
  value,
  fieldKey,
  type = 'text',
  options,
  onChange,
  isModified,
}: FieldEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));

  const displayValue = value === null || value === undefined ? '-' : String(value);

  const handleSave = () => {
    let newValue: any = editValue;

    if (type === 'boolean') {
      newValue = editValue === 'true';
    } else if (editValue === '') {
      newValue = null;
    }

    onChange(fieldKey, newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value ?? ''));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        {isEditing ? (
          <div className="mt-1 flex items-center gap-2">
            {type === 'boolean' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : type === 'select' && options ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type === 'date' ? 'date' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            )}
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:text-green-700"
              title="Save"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Cancel"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-sm ${isModified ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
              {type === 'boolean' ? (value ? 'Yes' : 'No') : displayValue}
            </span>
            {isModified && (
              <span className="text-[10px] text-blue-600 uppercase">Modified</span>
            )}
          </div>
        )}
      </div>
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-gray-400 hover:text-blue-600"
          title="Edit"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );
}
