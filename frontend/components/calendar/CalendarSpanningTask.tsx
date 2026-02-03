'use client';

import type { Task, TaskStatus, TaskPriority } from '@/types/task';

// Status background colors mapping (full opacity for spanning bars)
const STATUS_BG_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-slate-600/80',
  IN_PROGRESS: 'bg-cyan-600/80',
  IN_REVIEW: 'bg-violet-600/80',
  NEED_FIX: 'bg-orange-600/80',
  COMPLETE: 'bg-emerald-600/80',
  ON_HOLD: 'bg-amber-600/80',
};

// Priority dot colors
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-blue-400',
  LOW: 'bg-slate-400',
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
          transition-all duration-150
          ${isStart ? 'rounded-l-md' : ''}
          ${isEnd ? 'rounded-r-md' : ''}
          hover:brightness-125 hover:shadow-md
          border-y border-white/20
          ${isStart ? 'border-l border-l-white/20' : ''}
          ${isEnd ? 'border-r border-r-white/20' : ''}
        `}
      >
        {/* Priority dot - only show at start */}
        {isStart && (
          <div className={`w-1.5 h-1.5 rounded-full ${priorityColor} flex-shrink-0`} />
        )}

        {/* Task title */}
        <span className="text-[10px] font-mono text-white truncate flex-1">
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
