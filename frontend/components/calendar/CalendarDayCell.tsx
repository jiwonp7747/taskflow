'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Task } from '@/types/task';
import { CalendarTaskChip } from './CalendarTaskChip';

interface CalendarDayCellProps {
  date: Date;
  dateKey: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  isToday: boolean;
  isCurrentMonth: boolean;
  workingTaskIds: string[];
  onDateDoubleClick?: (date: Date) => void;
}

const MAX_VISIBLE_TASKS = 3;

export function CalendarDayCell({
  date,
  dateKey,
  tasks,
  onTaskClick,
  isToday,
  isCurrentMonth,
  workingTaskIds,
  onDateDoubleClick,
}: CalendarDayCellProps) {
  const dayNumber = date.getDate();
  const hasMore = tasks.length > MAX_VISIBLE_TASKS;
  const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);

  // Make this cell a droppable zone using the dateKey as id
  const { isOver, setNodeRef } = useDroppable({
    id: dateKey,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col min-h-[120px] p-1.5 border-r border-b border-[var(--glass-border)]
        transition-all duration-200
        ${isCurrentMonth ? 'bg-[var(--bg-primary)]' : 'bg-[var(--glass-bg)]'}
        ${isToday ? 'bg-[var(--calendar-today-bg)] ring-1 ring-inset ring-[var(--calendar-today-border)]' : ''}
        ${isOver
          ? 'bg-[var(--calendar-today-bg)] ring-2 ring-inset ring-[var(--calendar-today-border)] shadow-inner shadow-[var(--calendar-today-border)]/10'
          : 'hover:bg-[var(--calendar-cell-hover)]'
        }
      `}
      onDoubleClick={(e) => {
        // Only trigger if clicking the cell background, not a task chip
        if ((e.target as HTMLElement).closest('button')) return;
        onDateDoubleClick?.(date);
      }}
    >
      {/* Day number */}
      <div className="flex items-center justify-center mb-1">
        <span
          className={`
            w-7 h-7 flex items-center justify-center rounded-full text-xs font-mono
            transition-colors
            ${isToday
              ? 'bg-[var(--accent-primary)] text-[var(--calendar-today-text)] font-bold shadow-lg shadow-[var(--accent-primary)]/30'
              : isCurrentMonth
                ? 'text-[var(--text-secondary)]'
                : 'text-[var(--text-tertiary)]'
            }
          `}
        >
          {dayNumber}
        </span>
      </div>

      {/* Tasks container */}
      <div className="flex-1 space-y-0.5 overflow-hidden">
        {visibleTasks.map(task => (
          <CalendarTaskChip
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            isAiWorking={workingTaskIds.includes(task.id)}
          />
        ))}

        {/* Show more indicator */}
        {hasMore && (
          <div className="text-[9px] font-mono text-[var(--text-tertiary)] text-center py-0.5 hover:text-[var(--accent-primary)] cursor-pointer transition-colors">
            +{tasks.length - MAX_VISIBLE_TASKS} more
          </div>
        )}

        {/* Empty state for cells without tasks */}
        {tasks.length === 0 && isCurrentMonth && (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
