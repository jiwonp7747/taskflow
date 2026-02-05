'use client';

import { useRef } from 'react';

interface DatePickerProps {
  value?: string;  // ISO date string
  onChange: (date: string | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  showTime?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  className = '',
  minDate,
  maxDate,
  showTime = false,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format for date input value (YYYY-MM-DD)
  const toDateFormat = (dateStr?: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  // Extract time (HH:mm) directly from ISO string (treated as local time)
  // Date-only strings (no 'T') have no time part
  const toTimeFormat = (dateStr?: string) => {
    if (!dateStr || !dateStr.includes('T') || dateStr.length < 16) return '';
    const h = dateStr.slice(11, 13);
    const m = dateStr.slice(14, 16);
    return `${h}:${m}`;
  };

  // Build date string from date part (YYYY-MM-DD) and optional time part (HH:mm)
  // Date-only when no time, with time part when specified
  const buildISOString = (datePart: string, timePart?: string) => {
    if (!datePart) return undefined;
    if (timePart) {
      return `${datePart}T${timePart}:00.000`;
    }
    return datePart;
  };

  // Handle date change - preserve existing time if set
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      const currentTime = toTimeFormat(value);
      onChange(buildISOString(newDate, currentTime || undefined));
    } else {
      onChange(undefined);
    }
  };

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    const currentDate = toDateFormat(value);
    if (currentDate) {
      onChange(buildISOString(currentDate, newTime || undefined));
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={toDateFormat(value)}
          min={toDateFormat(minDate)}
          max={toDateFormat(maxDate)}
          onChange={handleDateChange}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--foreground)]
            focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
            transition-all cursor-pointer
            [color-scheme:dark]
            placeholder:text-[var(--text-muted)]"
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Calendar icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {/* Time input - shown when showTime is enabled and a date is selected */}
      {showTime && value && (
        <div className="relative mt-1.5">
          <input
            type="time"
            value={toTimeFormat(value)}
            onChange={handleTimeChange}
            className="w-full px-4 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--foreground)]
              focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
              transition-all cursor-pointer
              [color-scheme:dark]
              placeholder:text-[var(--text-muted)]"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
