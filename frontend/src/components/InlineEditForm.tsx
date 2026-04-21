import { useState, useEffect, useRef } from 'react';
import FlexibleDateInput from './FlexibleDateInput';
import { DatePrecision } from '../api/client';

export interface EditField {
  key: string;
  placeholder: string;
  type?: 'text' | 'tel' | 'date' | 'number' | 'textarea' | 'select' | 'checkbox' | 'flexible_date';
  /** For flexible_date type: the key in values that holds the precision string */
  precisionKey?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  label?: string;
  step?: string;
  min?: string;
  rows?: number;
  disabled?: boolean;
  helpText?: string;
  maxFutureYears?: number;
  /** If set, render this field on the same row as adjacent fields sharing the same gridGroup */
  gridGroup?: string;
}

interface InlineEditFormProps {
  fields: EditField[] | ((values: Record<string, string | boolean>) => EditField[]);
  values: Record<string, string | boolean>;
  onSave: (values: Record<string, string | boolean>) => void;
  onCancel: () => void;
  className?: string;
  resetKey?: string | number;
  submitError?: string | null;
  onChange?: (values: Record<string, string | boolean>) => void;
}

function AutocompleteSelect({ field, value, onChange }: { field: EditField; value: string; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = field.options || [];
  const filtered = value.trim()
    ? options.filter(o => o.label.toLowerCase().includes(value.toLowerCase()))
    : options;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filtered.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          onChange(filtered[highlightedIndex].value);
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div key={field.key}>
      {field.label && <label className="text-sm text-surface-600">{field.label}</label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); setHighlightedIndex(-1); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={field.placeholder}
          className="input"
          autoComplete="off"
          disabled={field.disabled}
        />
        {isOpen && filtered.length > 0 && (
          <div ref={dropdownRef} className="absolute z-10 w-full mt-1 bg-white border border-surface-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filtered.map((o, index) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setIsOpen(false); setHighlightedIndex(-1); inputRef.current?.focus(); }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors ${
                  index === highlightedIndex ? 'bg-primary-50 text-primary-900' : 'text-navy'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InlineEditForm({
  fields,
  values: initialValues,
  onSave,
  onCancel,
  className = '',
  resetKey,
  submitError = null,
  onChange,
}: InlineEditFormProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>(initialValues);
  const [validationError, setValidationError] = useState<string | null>(null);
  const resolvedFields = typeof fields === 'function' ? fields(values) : fields;

  useEffect(() => {
    if (resetKey === undefined) {
      return;
    }
    setValues(initialValues);
    setValidationError(null);
  }, [initialValues, resetKey]);

  const setValue = (key: string, value: string | boolean) => {
    setValidationError(null);
    setValues(prev => {
      const nextValues = { ...prev, [key]: value };
      onChange?.(nextValues);
      return nextValues;
    });
  };

  const handleSave = () => {
    for (const field of resolvedFields) {
      if (!field.required) continue;

      const rawValue = values[field.key];
      const isMissing =
        rawValue === undefined ||
        rawValue === null ||
        rawValue === false ||
        (typeof rawValue === 'string' && rawValue.trim() === '');

      if (isMissing) {
        setValidationError(field.label || field.placeholder.replace(/\s*\*$/, ''));
        return;
      }
    }

    setValidationError(null);
    onSave(values);
  };

  const renderField = (field: EditField) => {
    const val = values[field.key] ?? '';

    if (field.type === 'checkbox') {
      return (
        <div key={field.key} className="space-y-1">
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`edit-${field.key}`}
              checked={val as boolean}
              onChange={(e) => setValue(field.key, e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
              disabled={field.disabled}
            />
            <label htmlFor={`edit-${field.key}`} className="ml-2 block text-sm text-surface-700">
              {field.placeholder}
            </label>
          </div>
          {field.helpText && (
            <p className="pl-6 text-xs text-surface-500">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <AutocompleteSelect
          key={field.key}
          field={field}
          value={val as string}
          onChange={(v) => setValue(field.key, v)}
        />
      );
    }

    if (field.type === 'flexible_date') {
      const precisionKey = field.precisionKey || `${field.key}_precision`;
      const currentPrecision = (values[precisionKey] as string as DatePrecision) || 'day';
      return (
        <div key={field.key}>
          <FlexibleDateInput
            value={val as string}
            precision={currentPrecision}
            onChange={(date, precision) => {
              setValidationError(null);
              setValues(prev => {
                const nextValues = { ...prev, [field.key]: date, [precisionKey]: precision };
                onChange?.(nextValues);
                return nextValues;
              });
            }}
            label={field.label || field.placeholder}
            required={field.required}
            disabled={field.disabled}
            maxFutureYears={field.maxFutureYears}
          />
          {field.helpText && (
            <p className="mt-1 text-xs text-surface-500">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.key}>
          {field.label && <label className="text-sm text-surface-600">{field.label}</label>}
          <textarea
            placeholder={field.placeholder}
            value={val as string}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="input"
            rows={field.rows ?? 2}
            disabled={field.disabled}
          />
          {field.helpText && (
            <p className="mt-1 text-xs text-surface-500">{field.helpText}</p>
          )}
        </div>
      );
    }

    return (
      <div key={field.key}>
        {field.label && <label className="text-sm text-surface-600">{field.label}</label>}
        <input
          type={field.type || 'text'}
          placeholder={field.placeholder}
          value={val as string}
          onChange={(e) => setValue(field.key, e.target.value)}
          className="input"
          step={field.step}
          min={field.min}
          disabled={field.disabled}
        />
        {field.helpText && (
          <p className="mt-1 text-xs text-surface-500">{field.helpText}</p>
        )}
      </div>
    );
  };

  // Group fields by gridGroup for side-by-side rendering
  const renderFields = () => {
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < resolvedFields.length) {
      const field = resolvedFields[i];
      if (field.gridGroup) {
        const groupFields = [];
        while (i < resolvedFields.length && resolvedFields[i].gridGroup === field.gridGroup) {
          groupFields.push(resolvedFields[i]);
          i++;
        }
        const gridCols = groupFields.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
        elements.push(
          <div key={`grid-${field.gridGroup}`} className={`grid ${gridCols} gap-3`}>
            {groupFields.map(renderField)}
          </div>
        );
      } else {
        elements.push(renderField(field));
        i++;
      }
    }
    return elements;
  };

  return (
    <div className={`bg-surface rounded-lg p-4 space-y-3 ${className}`}>
      {renderFields()}
      {validationError && (
        <div className="bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
          {validationError} is required.
        </div>
      )}
      {submitError && (
        <div className="bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
          {submitError}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} className="btn-primary text-sm">Save</button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
      </div>
    </div>
  );
}
