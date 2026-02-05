'use client';

import type { Task, TaskStatus, TaskPriority } from '@/types/task';

const STATUS_BG_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-[var(--status-todo-bg)]',
  IN_PROGRESS: 'bg-[var(--status-in-progress-bg)]',
  IN_REVIEW: 'bg-[var(--status-in-review-bg)]',
  NEED_FIX: 'bg-[var(--status-need-fix-bg)]',
  COMPLETE: 'bg-[var(--status-complete-bg)]',
  ON_HOLD: 'bg-[var(--status-on-hold-bg)]',
};

const STATUS_BORDER_COLORS: Record<TaskStatus, string> = {
  TODO: 'border-[var(--glass-border)]',
  IN_PROGRESS: 'border-[var(--status-in-progress-border)]',
  IN_REVIEW: 'border-[var(--status-in-review-border)]',
  NEED_FIX: 'border-[var(--status-need-fix-border)]',
  COMPLETE: 'border-[var(--status-complete-border)]',
  ON_HOLD: 'border-[var(--status-on-hold-border)]',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: 'bg-[var(--priority-urgent-dot)]',
  HIGH: 'bg-[var(--priority-high-dot)]',
  MEDIUM: 'bg-[var(--priority-medium-dot)]',
  LOW: 'bg-[var(--priority-low-dot)]',
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
          ${isAiWorking ? 'animate-pulse ring-1 ring-[var(--accent-primary)]/50' : ''}
          overflow-hidden px-2 py-1
        `}
      >
        <div className="flex items-start gap-1.5 h-full">
          {/* Priority dot */}
          <div className={`w-2 h-2 rounded-full ${priorityColor} flex-shrink-0 mt-0.5`} />

          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="text-[11px] font-mono text-[var(--foreground)] truncate leading-tight">
              {task.title}
            </div>

            {/* Time range - only if enough height */}
            {!showCompact && startTime && (
              <div className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5">
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
                  ? 'bg-[var(--accent-primary)]/30 text-[var(--accent-primary)]'
                  : 'bg-[var(--status-in-review-bg)] text-[var(--status-in-review-text)]'
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
