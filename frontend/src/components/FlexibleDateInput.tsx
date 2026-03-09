import { useState, useEffect } from 'react';
import { DatePrecision } from '../api/client';

interface FlexibleDateInputProps {
  value: string;
  precision: DatePrecision;
  onChange: (date: string, precision: DatePrecision) => void;
  label?: string;
  required?: boolean;
}

const MONTHS = [
  { value: '', label: '-- Month --' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDateWithPrecision(dateStr: string, precision: DatePrecision): { year: string; month: string; day: string } {
  if (!dateStr) return { year: '', month: '', day: '' };

  // Handle ISO dates with T
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');

  const year = parts[0] || '';
  const month = parts[1] || '';
  const day = parts[2] || '';

  if (precision === 'year') {
    return { year, month: '', day: '' };
  }
  if (precision === 'month') {
    return { year, month, day: '' };
  }
  return { year, month, day };
}

export default function FlexibleDateInput({ value, precision, onChange, label, required }: FlexibleDateInputProps) {
  const parsed = parseDateWithPrecision(value, precision);
  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  // Sync state when external value/precision changes
  useEffect(() => {
    const p = parseDateWithPrecision(value, precision);
    setYear(p.year);
    setMonth(p.month);
    setDay(p.day);
  }, [value, precision]);

  const emitChange = (newYear: string, newMonth: string, newDay: string) => {
    if (!newYear) {
      onChange('', 'day');
      return;
    }

    const paddedYear = newYear.padStart(4, '0');

    if (!newMonth) {
      // Year only
      onChange(`${paddedYear}-01-01`, 'year');
    } else if (!newDay) {
      // Month + year
      onChange(`${paddedYear}-${newMonth}-01`, 'month');
    } else {
      // Full date
      onChange(`${paddedYear}-${newMonth}-${newDay}`, 'day');
    }
  };

  const handleYearChange = (val: string) => {
    setYear(val);
    if (!val) {
      setMonth('');
      setDay('');
    }
    emitChange(val, val ? month : '', val ? day : '');
  };

  const handleMonthChange = (val: string) => {
    setMonth(val);
    // If month is cleared, clear day too
    if (!val) {
      setDay('');
      emitChange(year, '', '');
    } else {
      // If day is set but exceeds new month's days, clear it
      if (day) {
        const maxDays = getDaysInMonth(parseInt(year) || 2024, parseInt(val));
        if (parseInt(day) > maxDays) {
          setDay('');
          emitChange(year, val, '');
          return;
        }
      }
      emitChange(year, val, day);
    }
  };

  const handleDayChange = (val: string) => {
    setDay(val);
    emitChange(year, month, val);
  };

  const maxDays = month && year
    ? getDaysInMonth(parseInt(year) || 2024, parseInt(month))
    : 31;

  const dayOptions = [{ value: '', label: '-- Day --' }];
  for (let d = 1; d <= maxDays; d++) {
    dayOptions.push({ value: d.toString().padStart(2, '0'), label: d.toString() });
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [{ value: '', label: '-- Year --' }];
  for (let y = currentYear; y >= 1990; y--) {
    yearOptions.push({ value: y.toString(), label: y.toString() });
  }

  return (
    <div>
      {label && <label className="text-sm text-gray-600">{label}{required && ' *'}</label>}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className="input text-sm"
          >
            {yearOptions.map(y => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="input text-sm"
            disabled={!year}
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            className="input text-sm"
            disabled={!month}
          >
            {dayOptions.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

/**
 * Format a date string with its precision for display.
 * 'year'  -> "2024"
 * 'month' -> "March 2024"
 * 'day'   -> "March 15, 2024"
 */
export function formatFlexibleDate(dateStr: string | null, precision?: DatePrecision): string {
  if (!dateStr) return '';

  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);

  const effectivePrecision = precision || 'day';

  if (effectivePrecision === 'year') {
    return year.toString();
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });

  if (effectivePrecision === 'month') {
    return `${monthName} ${year}`;
  }

  return `${monthName} ${day}, ${year}`;
}
