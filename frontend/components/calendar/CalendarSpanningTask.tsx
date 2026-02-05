'use client';

import type { Task, TaskStatus, TaskPriority } from '@/types/task';

// Status background colors mapping (using CSS variables)
const STATUS_BG_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-[var(--status-todo-bg)]',
  IN_PROGRESS: 'bg-[var(--status-in-progress-bg)]',
  IN_REVIEW: 'bg-[var(--status-in-review-bg)]',
  NEED_FIX: 'bg-[var(--status-need-fix-bg)]',
  COMPLETE: 'bg-[var(--status-complete-bg)]',
  ON_HOLD: 'bg-[var(--status-on-hold-bg)]',
};

// Status border colors mapping (using CSS variables)
const STATUS_BORDER_COLORS: Record<TaskStatus, string> = {
  TODO: 'border-[var(--status-todo-border)]',
  IN_PROGRESS: 'border-[var(--status-in-progress-border)]',
  IN_REVIEW: 'border-[var(--status-in-review-border)]',
  NEED_FIX: 'border-[var(--status-need-fix-border)]',
  COMPLETE: 'border-[var(--status-complete-border)]',
  ON_HOLD: 'border-[var(--status-on-hold-border)]',
};

// Priority dot colors (using CSS variables)
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: 'bg-[var(--priority-urgent-dot)]',
  HIGH: 'bg-[var(--priority-high-dot)]',
  MEDIUM: 'bg-[var(--priority-medium-dot)]',
  LOW: 'bg-[var(--priority-low-dot)]',
};

interface CalendarSpanningTaskProps {
  task: Task;
  startCol: number;  // 0-6 (column index within the week)
  spanCols: number;  // How many columns to span
  rowIndex: number;  // Which row within the spanning area
  onClick: () => void;
  isAiWorking?: boolean;
  isStart?: boolean;  // Is this the start of the task in this week?
  isEnd?: boolean;    // Is this the end of the task in this week?
}

export function CalendarSpanningTask({
  task,
  startCol,
  spanCols,
  rowIndex,
  onClick,
  isAiWorking = false,
  isStart = true,
  isEnd = true,
}: CalendarSpanningTaskProps) {
  const statusBgColor = STATUS_BG_COLORS[task.status] || STATUS_BG_COLORS.TODO;
  const statusBorderColor = STATUS_BORDER_COLORS[task.status] || STATUS_BORDER_COLORS.TODO;
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.LOW;
  const isAiAssigned = task.assignee === 'ai-agent';

  return (
    <div
      className="absolute h-5 flex items-center cursor-pointer group z-10"
      style={{
        left: `calc(${(startCol / 7) * 100}% + 2px)`,
        width: `calc(${(spanCols / 7) * 100}% - 4px)`,
        top: `${rowIndex * 22 + 2}px`,
      }}
      onClick={onClick}
    >
      <div
        className={`
          w-full h-full flex items-center gap-1 px-1.5
          ${statusBgColor}
          ${statusBorderColor}
          transition-all duration-150
          ${isStart ? 'rounded-l-md' : ''}
          ${isEnd ? 'rounded-r-md' : ''}
          hover:brightness-125 hover:shadow-md
          border-y
          ${isStart ? 'border-l' : ''}
          ${isEnd ? 'border-r' : ''}
        `}
      >
        {/* Priority dot - only show at start */}
        {isStart && (
          <div className={`w-1.5 h-1.5 rounded-full ${priorityColor} flex-shrink-0`} />
        )}

        {/* Task title */}
        <span className="text-[10px] font-mono text-[var(--foreground)] truncate flex-1">
          {task.title}
        </span>

        {/* AI indicator - only show at end */}
        {isEnd && isAiAssigned && (
          <span
            className={`
              text-[8px] font-mono px-1 rounded flex-shrink-0
              ${isAiWorking
                ? 'bg-cyan-400/30 text-cyan-300 animate-pulse'
                : 'bg-violet-500/30 text-violet-300'
              }
            `}
          >
            AI
          </span>
        )}
      </div>
    </div>
  );
}

// Helper type for spanning task calculation
export interface SpanningTaskInfo {
  task: Task;
  startDate: Date;
  endDate: Date;
}

// Parse YYYY-MM-DD from ISO string and create a local midnight Date
function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Utility function to calculate spanning info for a task
export function getTaskSpanInfo(task: Task): SpanningTaskInfo | null {
  if (!task.start_date && !task.due_date) {
    return null;
  }

  const startDateStr = task.start_date || task.due_date;
  const endDateStr = task.due_date || task.start_date;

  if (!startDateStr || !endDateStr) {
    return null;
  }

  // Parse date portion only (treat as local time)
  const startDate = toLocalDate(startDateStr);
  const endDate = toLocalDate(endDateStr);

  // Check if it spans multiple days by comparing date strings
  if (startDateStr.slice(0, 10) === endDateStr.slice(0, 10)) {
    return null; // Single day task, not spanning
  }

  return {
    task,
    startDate,
    endDate,
  };
}

// Check if a date falls within the task's date range
export function isDateInTaskRange(date: Date, spanInfo: SpanningTaskInfo): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate >= spanInfo.startDate && checkDate <= spanInfo.endDate;
}
