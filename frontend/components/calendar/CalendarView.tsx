'use client';

import { useMemo } from 'react';
import type { Task } from '@/types/task';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { getTaskSpanInfo, type SpanningTaskInfo } from './CalendarSpanningTask';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  workingTaskIds?: string[];
}

export function CalendarView({
  tasks,
  onTaskClick,
  workingTaskIds = [],
}: CalendarViewProps) {
  const {
    calendarDays,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    isToday,
    isCurrentMonth,
    formatMonthYear,
  } = useCalendar();

  // Separate spanning tasks (multi-day) from single-day tasks
  const { spanningTasks, singleDayTasks } = useMemo(() => {
    const spanning: SpanningTaskInfo[] = [];
    const singleDay: Task[] = [];

    tasks.forEach(task => {
      const spanInfo = getTaskSpanInfo(task);
      if (spanInfo) {
        spanning.push(spanInfo);
      } else {
        singleDay.push(task);
      }
    });

    // Sort spanning tasks by start date, then by duration (longer first)
    spanning.sort((a, b) => {
      const startDiff = a.startDate.getTime() - b.startDate.getTime();
      if (startDiff !== 0) return startDiff;
      // For same start date, longer spans first
      const aDuration = a.endDate.getTime() - a.startDate.getTime();
      const bDuration = b.endDate.getTime() - b.startDate.getTime();
      return bDuration - aDuration;
    });

    return { spanningTasks: spanning, singleDayTasks: singleDay };
  }, [tasks]);

  // Group single-day tasks by due_date
  // Also include spanning tasks in their respective date buckets for reference
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    // Add single-day tasks
    singleDayTasks.forEach(task => {
      if (task.due_date) {
        const dateKey = task.due_date.split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });

    // Add spanning tasks to all dates they cover (for reference and click handling)
    spanningTasks.forEach(spanInfo => {
      const currentDate = new Date(spanInfo.startDate);
      while (currentDate <= spanInfo.endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        // Don't duplicate - add to each date in range
        if (!grouped[dateKey].find(t => t.id === spanInfo.task.id)) {
          grouped[dateKey].push(spanInfo.task);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Sort tasks within each day by priority (URGENT > HIGH > MEDIUM > LOW)
    const priorityOrder: Record<string, number> = {
      URGENT: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      });
    });

    return grouped;
  }, [singleDayTasks, spanningTasks]);

  // Count tasks without any date
  const tasksWithoutDate = useMemo(() => {
    return tasks.filter(task => !task.due_date && !task.start_date).length;
  }, [tasks]);

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] bg-slate-900/30 border border-white/5 rounded-xl overflow-hidden">
      <CalendarHeader
        monthYear={formatMonthYear()}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
      />

      <CalendarGrid
        days={calendarDays}
        tasksByDate={tasksByDate}
        spanningTasks={spanningTasks}
        onTaskClick={onTaskClick}
        isToday={isToday}
        isCurrentMonth={isCurrentMonth}
        workingTaskIds={workingTaskIds}
      />

      {/* Footer with tasks without date indicator */}
      {tasksWithoutDate > 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-slate-950/50">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <span className="text-amber-400">{tasksWithoutDate}</span> task{tasksWithoutDate > 1 ? 's' : ''} without date (not shown on calendar)
            </span>
          </div>
        </div>
      )}

      {/* Legend for spanning tasks */}
      {spanningTasks.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-slate-950/50">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <div className="w-8 h-3 bg-cyan-500/60 rounded-sm" />
            <span>
              <span className="text-cyan-400">{spanningTasks.length}</span> task{spanningTasks.length > 1 ? 's' : ''} spanning multiple days
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
