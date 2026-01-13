'use client';

import { useMemo } from 'react';
import type { Task } from '@/types/task';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';

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

  // Group tasks by due_date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    tasks.forEach(task => {
      if (task.due_date) {
        // Extract YYYY-MM-DD from ISO string
        const dateKey = task.due_date.split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
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
  }, [tasks]);

  // Count tasks without due_date
  const tasksWithoutDueDate = useMemo(() => {
    return tasks.filter(task => !task.due_date).length;
  }, [tasks]);

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-slate-900/30 border border-white/5 rounded-xl overflow-hidden">
      <CalendarHeader
        monthYear={formatMonthYear()}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
      />

      <CalendarGrid
        days={calendarDays}
        tasksByDate={tasksByDate}
        onTaskClick={onTaskClick}
        isToday={isToday}
        isCurrentMonth={isCurrentMonth}
        workingTaskIds={workingTaskIds}
      />

      {/* Footer with tasks without due date indicator */}
      {tasksWithoutDueDate > 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-slate-950/50">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <span className="text-amber-400">{tasksWithoutDueDate}</span> task{tasksWithoutDueDate > 1 ? 's' : ''} without due date (not shown on calendar)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
