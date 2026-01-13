'use client';

import type { Task } from '@/types/task';
import { CalendarDayCell } from './CalendarDayCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarGridProps {
  days: Date[];
  tasksByDate: Record<string, Task[]>;
  onTaskClick: (task: Task) => void;
  isToday: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
  workingTaskIds: string[];
}

export function CalendarGrid({
  days,
  tasksByDate,
  onTaskClick,
  isToday,
  isCurrentMonth,
  workingTaskIds,
}: CalendarGridProps) {
  // Helper to format date to YYYY-MM-DD for lookup
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-white/5 bg-slate-900/30">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="px-2 py-2 text-center text-[10px] font-mono text-slate-500 uppercase tracking-wider border-r border-white/5 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
        {days.map((date, index) => {
          const dateKey = formatDateKey(date);
          const dayTasks = tasksByDate[dateKey] || [];

          return (
            <CalendarDayCell
              key={index}
              date={date}
              tasks={dayTasks}
              onTaskClick={onTaskClick}
              isToday={isToday(date)}
              isCurrentMonth={isCurrentMonth(date)}
              workingTaskIds={workingTaskIds}
            />
          );
        })}
      </div>
    </div>
  );
}
