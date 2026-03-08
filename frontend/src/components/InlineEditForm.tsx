import { useState, useEffect } from 'react';
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
  /** If set, render this field on the same row as adjacent fields sharing the same gridGroup */
  gridGroup?: string;
}

interface InlineEditFormProps {
  fields: EditField[];
  values: Record<string, string | boolean>;
  onSave: (values: Record<string, string | boolean>) => void;
  onCancel: () => void;
  className?: string;
}

export default function InlineEditForm({ fields, values: initialValues, onSave, onCancel, className = '' }: InlineEditFormProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const setValue = (key: string, value: string | boolean) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(values);
  };

  const renderField = (field: EditField) => {
    const val = values[field.key] ?? '';

    if (field.type === 'checkbox') {
      return (
        <div key={field.key} className="flex items-center">
          <input
            type="checkbox"
            id={`edit-${field.key}`}
            checked={val as boolean}
            onChange={(e) => setValue(field.key, e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor={`edit-${field.key}`} className="ml-2 block text-sm text-gray-700">
            {field.placeholder}
          </label>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key}>
          {field.label && <label className="text-sm text-gray-600">{field.label}</label>}
          <select
            value={val as string}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="input"
          >
            {field.options?.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
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
              setValues(prev => ({ ...prev, [field.key]: date, [precisionKey]: precision }));
            }}
            label={field.label || field.placeholder}
            required={field.required}
          />
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.key}>
          {field.label && <label className="text-sm text-gray-600">{field.label}</label>}
          <textarea
            placeholder={field.placeholder}
            value={val as string}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="input"
            rows={field.rows ?? 2}
          />
        </div>
      );
    }

    return (
      <div key={field.key}>
        {field.label && <label className="text-sm text-gray-600">{field.label}</label>}
        <input
          type={field.type || 'text'}
          placeholder={field.placeholder}
          value={val as string}
          onChange={(e) => setValue(field.key, e.target.value)}
          className="input"
          step={field.step}
          min={field.min}
        />
      </div>
    );
  };

  // Group fields by gridGroup for side-by-side rendering
  const renderFields = () => {
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < fields.length) {
      const field = fields[i];
      if (field.gridGroup) {
        const groupFields = [];
        while (i < fields.length && fields[i].gridGroup === field.gridGroup) {
          groupFields.push(fields[i]);
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
    <div className={`bg-gray-50 rounded-lg p-4 space-y-3 ${className}`}>
      {renderFields()}
      <div className="flex gap-2">
        <button onClick={handleSave} className="btn-primary text-sm">Save</button>
        <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
      </div>
    </div>
  );
}
