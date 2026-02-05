'use client';

interface CalendarHeaderProps {
  monthYear: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  monthYear,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)] bg-[var(--calendar-header-bg)]">
      {/* Month/Year display */}
      <h2 className="text-lg font-semibold text-[var(--foreground)] tracking-wide">{monthYear}</h2>

      {/* Navigation controls */}
      <div className="flex items-center gap-2">
        {/* Today button */}
        <button
          onClick={onToday}
          className="px-3 py-1.5 text-xs font-mono text-[var(--accent-primary)] bg-[var(--glass-bg)] border border-[var(--accent-primary)]/30 rounded-lg hover:bg-[var(--accent-primary)]/10 transition-colors"
        >
          Today
        </button>

        {/* Previous/Next buttons */}
        <div className="flex items-center gap-1 bg-[var(--glass-bg)] rounded-lg p-0.5">
          <button
            onClick={onPreviousMonth}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--foreground)] hover:bg-[var(--muted-bg)] rounded-md transition-colors"
            title="Previous month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onNextMonth}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--foreground)] hover:bg-[var(--muted-bg)] rounded-md transition-colors"
            title="Next month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
