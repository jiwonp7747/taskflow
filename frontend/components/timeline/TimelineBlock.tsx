'use client';

import type { Task, TaskStatus, TaskPriority } from '@/types/task';

const STATUS_BG_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-slate-600/80',
  IN_PROGRESS: 'bg-cyan-600/80',
  IN_REVIEW: 'bg-violet-600/80',
  NEED_FIX: 'bg-orange-600/80',
  COMPLETE: 'bg-emerald-600/80',
  ON_HOLD: 'bg-amber-600/80',
};

const STATUS_BORDER_COLORS: Record<TaskStatus, string> = {
  TODO: 'border-slate-500/50',
  IN_PROGRESS: 'border-cyan-500/50',
  IN_REVIEW: 'border-violet-500/50',
  NEED_FIX: 'border-orange-500/50',
  COMPLETE: 'border-emerald-500/50',
  ON_HOLD: 'border-amber-500/50',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-blue-400',
  LOW: 'bg-slate-400',
};

interface TimelineBlockProps {
  task: Task;
  top: number;
  height: number;
  left: string;
  width: string;
  onClick: () => void;
  isAiWorking?: boolean;
}

export function TimelineBlock({
  task,
  top,
  height,
  left,
  width,
  onClick,
  isAiWorking = false,
}: TimelineBlockProps) {
  const statusBg = STATUS_BG_COLORS[task.status] || STATUS_BG_COLORS.TODO;
  const statusBorder = STATUS_BORDER_COLORS[task.status] || STATUS_BORDER_COLORS.TODO;
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.LOW;
  const isAiAssigned = task.assignee === 'ai-agent';

  // Format time from ISO string (read directly, treated as local time)
  const formatTime = (dateStr?: string) => {
    if (!dateStr || !dateStr.includes('T') || dateStr.length < 16) return '';
    return `${dateStr.slice(11, 13)}:${dateStr.slice(14, 16)}`;
  };

  const startTime = formatTime(task.start_date);
  const endTime = formatTime(task.due_date);
  const showCompact = height < 40;

  return (
    <div
      className="absolute cursor-pointer group z-10"
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 24)}px`,
        left,
        width,
      }}
      onClick={onClick}
    >
      <div
        className={`
          h-full rounded-md border ${statusBorder} ${statusBg}
          transition-all duration-150
          hover:brightness-125 hover:shadow-lg hover:z-20
          ${isAiWorking ? 'animate-pulse ring-1 ring-cyan-400/50' : ''}
          overflow-hidden px-2 py-1
        `}
      >
        <div className="flex items-start gap-1.5 h-full">
          {/* Priority dot */}
          <div className={`w-2 h-2 rounded-full ${priorityColor} flex-shrink-0 mt-0.5`} />

          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="text-[11px] font-mono text-white truncate leading-tight">
              {task.title}
            </div>

            {/* Time range - only if enough height */}
            {!showCompact && startTime && (
              <div className="text-[9px] font-mono text-white/60 mt-0.5">
                {startTime}{endTime ? ` - ${endTime}` : ''}
              </div>
            )}
          </div>

          {/* AI indicator */}
          {isAiAssigned && (
            <span
              className={`
                text-[8px] font-mono px-1 rounded flex-shrink-0
                ${isAiWorking
                  ? 'bg-cyan-400/30 text-cyan-300'
                  : 'bg-violet-500/30 text-violet-300'
                }
              `}
            >
              AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
