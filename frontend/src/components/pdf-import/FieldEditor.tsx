import { useState, useRef } from 'react';

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
  const propValue = String(value ?? '');
  const [localValue, setLocalValue] = useState(propValue);
  const lastPropValue = useRef(propValue);

  // Sync local state when prop value changes externally
  if (propValue !== lastPropValue.current) {
    lastPropValue.current = propValue;
    setLocalValue(propValue);
  }

  const save = (val: string) => {
    if (val === propValue) return; // No change, skip API call

    let newValue: any = val;
    if (type === 'boolean') {
      newValue = val === 'true';
    } else if (val === '') {
      newValue = null;
    }

    onChange(fieldKey, newValue);
  };

  const handleBlur = () => {
    save(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    save(val);
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-1.5 w-36 flex-shrink-0">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        {isModified && (
          <span className="text-[10px] text-blue-600 font-medium uppercase">Modified</span>
        )}
      </div>
      <div className="flex-1">
        {type === 'boolean' ? (
          <select
            value={localValue}
            onChange={handleSelectChange}
            className="block w-full px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : type === 'select' && options ? (
          <select
            value={localValue}
            onChange={handleSelectChange}
            className="block w-full px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:ring-blue-500 focus:border-blue-500"
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
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="block w-full px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:ring-blue-500 focus:border-blue-500"
          />
        )}
      </div>
    </div>
  );
}
