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
// Parses directly from ISO string, treating stored time as local time
function hasTime(dateStr: string): boolean {
  if (dateStr.length < 16) return false;
  const h = parseInt(dateStr.slice(11, 13), 10);
  const m = parseInt(dateStr.slice(14, 16), 10);
  return h !== 0 || m !== 0;
}

// Format a JS Date to YYYY-MM-DD
function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Check if a date falls on the target date
// Compares the date portion of ISO string directly (local time)
function isOnDate(dateStr: string, targetDate: Date): boolean {
  return dateStr.slice(0, 10) === formatDateKey(targetDate);
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
      // Uses string comparison on date portions (YYYY-MM-DD is lexicographically sortable)
      let spansThisDate = false;
      if (task.start_date && task.due_date) {
        const startKey = task.start_date.slice(0, 10);
        const endKey = task.due_date.slice(0, 10);
        const targetKey = formatDateKey(date);
        spansThisDate = startKey <= targetKey && targetKey <= endKey;
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
    <div className="flex flex-col h-[calc(100vh-320px)] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl overflow-hidden">
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
      <div className="px-4 py-2 border-t border-[var(--glass-border)] bg-[var(--calendar-header-bg)]">
        <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--text-tertiary)]">
          <span>
            <span className="text-cyan-500 dark:text-cyan-400">{timedTasks.length}</span> timed task{timedTasks.length !== 1 ? 's' : ''}
          </span>
          {allDayTasks.length > 0 && (
            <span>
              <span className="text-amber-500 dark:text-amber-400">{allDayTasks.length}</span> all-day task{allDayTasks.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
