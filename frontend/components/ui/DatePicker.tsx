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
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  className = '',
  minDate,
  maxDate,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format for input value (YYYY-MM-DD)
  const toInputFormat = (dateStr?: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  // Handle date change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue) {
      // Convert to ISO string with time set to noon to avoid timezone issues
      const date = new Date(newValue + 'T12:00:00');
      onChange(date.toISOString());
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={toInputFormat(value)}
          min={toInputFormat(minDate)}
          max={toInputFormat(maxDate)}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white
            focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
            transition-all cursor-pointer
            [color-scheme:dark]
            placeholder:text-slate-600"
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Calendar icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
