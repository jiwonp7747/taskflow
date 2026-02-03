'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Task } from '@/types/task';
import { PRIORITY_CONFIG } from '@/types/task';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { getTaskSpanInfo, type SpanningTaskInfo } from './CalendarSpanningTask';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (id: string, data: Partial<Task>) => Promise<Task | null>;
  workingTaskIds?: string[];
  onDateDoubleClick?: (date: Date) => void;
}

export function CalendarView({
  tasks,
  onTaskClick,
  onTaskUpdate,
  workingTaskIds = [],
  onDateDoubleClick,
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

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors - distance constraint of 8px so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  }, [tasks]);

  // Handle drag end - update task due_date (and start_date for spanning tasks)
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newDateKey = over.id as string; // "YYYY-MM-DD"

    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.due_date) return;

    // Extract date portion from existing due_date
    const oldDueDateKey = task.due_date.split('T')[0];

    // If dropped on the same date, do nothing
    if (oldDueDateKey === newDateKey) return;

    // Build new due_date preserving the time component
    // Replace only the date part (YYYY-MM-DD), keep time part as-is
    const dueHasTime = task.due_date.includes('T');
    const dueTimePart = dueHasTime ? task.due_date.substring(task.due_date.indexOf('T')) : '';
    const newDueDate = newDateKey + dueTimePart;

    // Handle spanning tasks - shift start_date by the same day offset
    if (task.start_date) {
      // Calculate day offset using local midnight (only for offset calculation)
      const dayOffsetMs = new Date(newDateKey + 'T00:00:00').getTime()
        - new Date(oldDueDateKey + 'T00:00:00').getTime();

      // Shift start date by offset, preserving time part
      const oldStartDateKey = task.start_date.slice(0, 10);
      const oldStartMs = new Date(oldStartDateKey + 'T00:00:00').getTime();
      const newStartLocal = new Date(oldStartMs + dayOffsetMs);
      const newStartKey = `${newStartLocal.getFullYear()}-${String(newStartLocal.getMonth() + 1).padStart(2, '0')}-${String(newStartLocal.getDate()).padStart(2, '0')}`;
      const startHasTime = task.start_date.includes('T');
      const startTimePart = startHasTime ? task.start_date.substring(task.start_date.indexOf('T')) : '';
      const newStartDateStr = newStartKey + startTimePart;

      await onTaskUpdate(taskId, {
        due_date: newDueDate,
        start_date: newStartDateStr,
      });
    } else {
      await onTaskUpdate(taskId, { due_date: newDueDate });
    }
  }, [tasks, onTaskUpdate]);

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
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
          onDateDoubleClick={onDateDoubleClick}
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

      {/* Drag overlay - shows mini task card while dragging */}
      <DragOverlay dropAnimation={{
        duration: 250,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? (
          <CalendarTaskOverlay task={activeTask} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Mini task card shown during drag */
function CalendarTaskOverlay({ task }: { task: Task }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const getPriorityDotColor = () => {
    switch (task.priority) {
      case 'URGENT': return 'bg-red-400';
      case 'HIGH': return 'bg-orange-400';
      case 'MEDIUM': return 'bg-blue-400';
      case 'LOW': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/50 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-cyan-500/30 rotate-2 max-w-[200px]">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityDotColor()}`} />
      <span className="text-xs font-medium text-cyan-100 truncate">
        {task.title}
      </span>
    </div>
  );
}
