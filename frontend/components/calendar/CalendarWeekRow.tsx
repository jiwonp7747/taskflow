'use client';

import type { Task } from '@/types/task';
import { CalendarDayCell } from './CalendarDayCell';
import { CalendarSpanningTask, type SpanningTaskInfo } from './CalendarSpanningTask';

interface CalendarWeekRowProps {
  weekDays: Date[];  // 7 days for this week
  tasksByDate: Record<string, Task[]>;
  spanningTasks: SpanningTaskInfo[];  // Tasks that span multiple days
  onTaskClick: (task: Task) => void;
  isToday: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
  workingTaskIds: string[];
  formatDateKey: (date: Date) => string;
  onDateDoubleClick?: (date: Date) => void;
}

// Calculate how a spanning task appears in a given week
interface SpanningTaskInWeek {
  spanInfo: SpanningTaskInfo;
  startCol: number;  // 0-6
  spanCols: number;  // 1-7
  isStart: boolean;  // Task actually starts in this week
  isEnd: boolean;    // Task actually ends in this week
}

function getSpanningTasksInWeek(
  weekDays: Date[],
  spanningTasks: SpanningTaskInfo[]
): SpanningTaskInWeek[] {
  const weekStart = new Date(weekDays[0]);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekDays[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const result: SpanningTaskInWeek[] = [];

  for (const spanInfo of spanningTasks) {
    // Check if this task overlaps with this week
    if (spanInfo.endDate < weekStart || spanInfo.startDate > weekEnd) {
      continue; // No overlap
    }

    // Calculate which column the task starts in this week
    let startCol = 0;
    let isStart = false;
    if (spanInfo.startDate >= weekStart) {
      // Task starts within this week
      startCol = spanInfo.startDate.getDay();
      isStart = true;
    }

    // Calculate which column the task ends in this week
    let endCol = 6;
    let isEnd = false;
    if (spanInfo.endDate <= weekEnd) {
      // Task ends within this week
      endCol = spanInfo.endDate.getDay();
      isEnd = true;
    }

    const spanCols = endCol - startCol + 1;

    result.push({
      spanInfo,
      startCol,
      spanCols,
      isStart,
      isEnd,
    });
  }

  // Sort by start date, then by duration (longer tasks first for visual stacking)
  result.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    return b.spanCols - a.spanCols; // Longer spans first
  });

  return result;
}

// Get tasks that are NOT spanning (single day only) for a given date
function getNonSpanningTasks(
  tasks: Task[],
  spanningTaskIds: Set<string>
): Task[] {
  return tasks.filter(task => !spanningTaskIds.has(task.id));
}

export function CalendarWeekRow({
  weekDays,
  tasksByDate,
  spanningTasks,
  onTaskClick,
  isToday,
  isCurrentMonth,
  workingTaskIds,
  formatDateKey,
  onDateDoubleClick,
}: CalendarWeekRowProps) {
  const spanningTasksInWeek = getSpanningTasksInWeek(weekDays, spanningTasks);
  const spanningTaskIds = new Set(spanningTasks.map(s => s.task.id));

  // Calculate row height based on number of spanning tasks
  const spanningRowHeight = spanningTasksInWeek.length > 0
    ? Math.max(spanningTasksInWeek.length * 24, 24)
    : 0;

  return (
    <div className="flex flex-col">
      {/* Spanning tasks row */}
      {spanningTasksInWeek.length > 0 && (
        <div
          className="relative grid grid-cols-7 border-b border-white/5"
          style={{ minHeight: `${spanningRowHeight}px` }}
        >
          {/* Grid lines for alignment */}
          {weekDays.map((_, index) => (
            <div
              key={index}
              className="border-r border-white/5 last:border-r-0"
            />
          ))}

          {/* Spanning task bars */}
          {spanningTasksInWeek.map((spanTask, index) => (
            <CalendarSpanningTask
              key={spanTask.spanInfo.task.id}
              task={spanTask.spanInfo.task}
              startCol={spanTask.startCol}
              spanCols={spanTask.spanCols}
              rowIndex={index}
              onClick={() => onTaskClick(spanTask.spanInfo.task)}
              isAiWorking={workingTaskIds.includes(spanTask.spanInfo.task.id)}
              isStart={spanTask.isStart}
              isEnd={spanTask.isEnd}
            />
          ))}
        </div>
      )}

      {/* Day cells row */}
      <div className="grid grid-cols-7">
        {weekDays.map((date, index) => {
          const dateKey = formatDateKey(date);
          const allDayTasks = tasksByDate[dateKey] || [];
          // Filter out spanning tasks from day cells
          const dayTasks = getNonSpanningTasks(allDayTasks, spanningTaskIds);

          return (
            <CalendarDayCell
              key={index}
              date={date}
              dateKey={dateKey}
              tasks={dayTasks}
              onTaskClick={onTaskClick}
              isToday={isToday(date)}
              isCurrentMonth={isCurrentMonth(date)}
              workingTaskIds={workingTaskIds}
              onDateDoubleClick={onDateDoubleClick}
            />
          );
        })}
      </div>
    </div>
  );
}
