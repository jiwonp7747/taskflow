'use client';

export type ViewType = 'kanban' | 'calendar' | 'timeline';

interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg">
      {/* Kanban view button */}
      <button
        onClick={() => onViewChange('kanban')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-mono rounded-md transition-all ${
          activeView === 'kanban'
            ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30'
            : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] border border-transparent'
        }`}
        title="Kanban Board View"
      >
        {/* Kanban icon - columns layout */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <span>Board</span>
      </button>

      {/* Calendar view button */}
      <button
        onClick={() => onViewChange('calendar')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-mono rounded-md transition-all ${
          activeView === 'calendar'
            ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30'
            : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] border border-transparent'
        }`}
        title="Calendar View"
      >
        {/* Calendar icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Calendar</span>
      </button>

      {/* Timeline view button */}
      <button
        onClick={() => onViewChange('timeline')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-mono rounded-md transition-all ${
          activeView === 'timeline'
            ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30'
            : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] border border-transparent'
        }`}
        title="Timeline View"
      >
        {/* Clock icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Timeline</span>
      </button>
    </div>
  );
}
