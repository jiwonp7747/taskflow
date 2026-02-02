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
        flex flex-col min-h-[120px] p-1.5 border-r border-b border-white/5
        transition-all duration-200
        ${isCurrentMonth ? 'bg-slate-900/20' : 'bg-slate-950/50'}
        ${isToday ? 'bg-cyan-950/30 ring-1 ring-inset ring-cyan-500/30' : ''}
        ${isOver
          ? 'bg-cyan-950/40 ring-2 ring-inset ring-cyan-500/50 shadow-inner shadow-cyan-500/10'
          : 'hover:bg-slate-800/30'
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
              ? 'bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/30'
              : isCurrentMonth
                ? 'text-slate-300'
                : 'text-slate-600'
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
          <div className="text-[9px] font-mono text-slate-500 text-center py-0.5 hover:text-cyan-400 cursor-pointer transition-colors">
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
