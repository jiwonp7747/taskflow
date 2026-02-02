'use client';

import { useMemo, useCallback } from 'react';
import type { Task } from '@/types/task';
import { TimelineHeader } from './TimelineHeader';
import { TimelineAllDay } from './TimelineAllDay';
import { TimelineGrid } from './TimelineGrid';

interface TimelineViewProps {
  tasks: Task[];
  date: Date;
  onTaskClick: (task: Task) => void;
  onDateChange: (date: Date) => void;
  workingTaskIds?: string[];
}

// Check if a date string has a meaningful time (not midnight 00:00:00)
function hasTime(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
}

// Check if a date falls on the target date
function isOnDate(dateStr: string, targetDate: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

export function TimelineView({
  tasks,
  date,
  onTaskClick,
  onDateChange,
  workingTaskIds = [],
}: TimelineViewProps) {
  // Filter tasks for this date, then split into all-day vs timed
  const { allDayTasks, timedTasks } = useMemo(() => {
    const allDay: Task[] = [];
    const timed: Task[] = [];

    for (const task of tasks) {
      const startOnDate = task.start_date && isOnDate(task.start_date, date);
      const dueOnDate = task.due_date && isOnDate(task.due_date, date);

      // Check if task spans across this date (multi-day tasks)
      let spansThisDate = false;
      if (task.start_date && task.due_date) {
        const start = new Date(task.start_date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(task.due_date);
        end.setHours(23, 59, 59, 999);
        const target = new Date(date);
        target.setHours(12, 0, 0, 0);
        spansThisDate = target >= start && target <= end;
      }

      if (!startOnDate && !dueOnDate && !spansThisDate) continue;

      // Determine if it has a specific time
      const startHasTime = task.start_date && hasTime(task.start_date);
      const dueHasTime = task.due_date && hasTime(task.due_date);

      if (startHasTime || dueHasTime) {
        timed.push(task);
      } else {
        allDay.push(task);
      }
    }

    return { allDayTasks: allDay, timedTasks: timed };
  }, [tasks, date]);

  const handlePreviousDay = useCallback(() => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  }, [date, onDateChange]);

  const handleNextDay = useCallback(() => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  }, [date, onDateChange]);

  const handleToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] bg-slate-900/30 border border-white/5 rounded-xl overflow-hidden">
      <TimelineHeader
        date={date}
        onPreviousDay={handlePreviousDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
      />

      <TimelineAllDay
        tasks={allDayTasks}
        onTaskClick={onTaskClick}
        workingTaskIds={workingTaskIds}
      />

      <TimelineGrid
        tasks={timedTasks}
        date={date}
        onTaskClick={onTaskClick}
        workingTaskIds={workingTaskIds}
      />

      {/* Footer with task count */}
      <div className="px-4 py-2 border-t border-white/5 bg-slate-950/50">
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
          <span>
            <span className="text-cyan-400">{timedTasks.length}</span> timed task{timedTasks.length !== 1 ? 's' : ''}
          </span>
          {allDayTasks.length > 0 && (
            <span>
              <span className="text-amber-400">{allDayTasks.length}</span> all-day task{allDayTasks.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
