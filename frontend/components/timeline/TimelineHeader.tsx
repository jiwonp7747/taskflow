'use client';

interface TimelineHeaderProps {
  date: Date;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

export function TimelineHeader({
  date,
  onPreviousDay,
  onNextDay,
  onToday,
}: TimelineHeaderProps) {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = dayNames[date.getDay()];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const isToday = (() => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  })();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/30">
      <div className="flex items-center gap-3">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPreviousDay}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5 rounded-md transition-all"
            title="Previous day"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onNextDay}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5 rounded-md transition-all"
            title="Next day"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Today button */}
        <button
          onClick={onToday}
          className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${
            isToday
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-white/5'
          }`}
        >
          Today
        </button>

        {/* Date display */}
        <h2 className="text-lg font-bold text-white font-mono">
          {year}년 {month}월 {day}일
          <span className="text-slate-400 ml-1">({dayOfWeek})</span>
        </h2>
      </div>
    </div>
  );
}
