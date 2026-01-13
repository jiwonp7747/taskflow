'use client';

export type ViewType = 'kanban' | 'calendar';

interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-900/50 border border-white/5 rounded-lg">
      {/* Kanban view button */}
      <button
        onClick={() => onViewChange('kanban')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-mono rounded-md transition-all ${
          activeView === 'kanban'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
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
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
        }`}
        title="Calendar View"
      >
        {/* Calendar icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Calendar</span>
      </button>
    </div>
  );
}
