'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import type { Task } from '@/types/task';
import { TimelineBlock } from './TimelineBlock';

const HOUR_HEIGHT = 60; // px per hour
const TOTAL_HEIGHT = HOUR_HEIGHT * 24; // 1440px
const MIN_BLOCK_HEIGHT = 24;

interface TimelineTaskPosition {
  task: Task;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

interface TimelineGridProps {
  tasks: Task[];
  date: Date;
  onTaskClick: (task: Task) => void;
  workingTaskIds: string[];
}

// Parse time from an ISO date string, returning minutes from midnight
// Reads directly from string, treating stored time as local time
function getMinutesFromMidnight(dateStr: string): number {
  if (!dateStr.includes('T') || dateStr.length < 16) return 0;
  const h = parseInt(dateStr.slice(11, 13), 10);
  const m = parseInt(dateStr.slice(14, 16), 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

// Calculate overlapping groups for column assignment
function calculateColumns(positions: { task: Task; top: number; height: number }[]): TimelineTaskPosition[] {
  if (positions.length === 0) return [];

  // Sort by top position
  const sorted = [...positions].sort((a, b) => a.top - b.top);
  const result: TimelineTaskPosition[] = [];

  // Group overlapping tasks
  const groups: { task: Task; top: number; height: number }[][] = [];
  let currentGroup: { task: Task; top: number; height: number }[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const groupEnd = Math.max(...currentGroup.map(t => t.top + t.height));

    if (current.top < groupEnd) {
      // Overlapping with current group
      currentGroup.push(current);
    } else {
      groups.push(currentGroup);
      currentGroup = [current];
    }
  }
  groups.push(currentGroup);

  // Assign columns within each group
  for (const group of groups) {
    const totalColumns = group.length;
    group.forEach((item, index) => {
      result.push({
        ...item,
        column: index,
        totalColumns,
      });
    });
  }

  return result;
}

export function TimelineGrid({
  tasks,
  date,
  onTaskClick,
  workingTaskIds,
}: TimelineGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // Check if date is today
  const isToday = useMemo(() => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }, [date]);

  // Calculate current time offset - updates every minute via state
  const [tick, setTick] = useState(0);

  const currentTimeOffset = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes * (HOUR_HEIGHT / 60);
  }, [isToday, tick]);

  // Set up interval to trigger recalculation every minute
  useEffect(() => {
    if (!isToday) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [isToday]);

  // Auto-scroll to current time or first task on mount
  useEffect(() => {
    if (hasScrolled.current) return;
    if (!scrollRef.current) return;

    const scrollTarget = currentTimeOffset
      ? Math.max(0, currentTimeOffset - 200)
      : tasks.length > 0
        ? 8 * HOUR_HEIGHT - 100 // default scroll to 8am
        : 0;

    scrollRef.current.scrollTop = scrollTarget;
    hasScrolled.current = true;
  }, [currentTimeOffset, tasks.length]);

  // Reset scroll flag when date changes
  useEffect(() => {
    hasScrolled.current = false;
  }, [date]);

  // Calculate task positions
  const taskPositions = useMemo(() => {
    const positions: { task: Task; top: number; height: number }[] = [];

    for (const task of tasks) {
      let startMinutes: number;
      let endMinutes: number;

      const startHasTime = task.start_date?.includes('T') && task.start_date.length >= 16;
      const dueHasTime = task.due_date?.includes('T') && task.due_date.length >= 16;

      if (startHasTime) {
        startMinutes = getMinutesFromMidnight(task.start_date!);
        if (dueHasTime) {
          // Check if due_date is same day (compare date portions directly)
          if (task.due_date!.slice(0, 10) === task.start_date!.slice(0, 10)) {
            endMinutes = getMinutesFromMidnight(task.due_date!);
          } else {
            // Multi-day: show until end of day
            endMinutes = 24 * 60;
          }
        } else {
          endMinutes = startMinutes + 60; // default 1 hour
        }
      } else if (dueHasTime) {
        endMinutes = getMinutesFromMidnight(task.due_date!);
        startMinutes = Math.max(0, endMinutes - 60); // 1 hour block before due
      } else {
        continue; // no time info, skip
      }

      // Ensure minimum duration
      if (endMinutes - startMinutes < MIN_BLOCK_HEIGHT / (HOUR_HEIGHT / 60)) {
        endMinutes = startMinutes + MIN_BLOCK_HEIGHT / (HOUR_HEIGHT / 60);
      }

      const top = startMinutes * (HOUR_HEIGHT / 60);
      const height = Math.max((endMinutes - startMinutes) * (HOUR_HEIGHT / 60), MIN_BLOCK_HEIGHT);

      positions.push({ task, top, height });
    }

    return calculateColumns(positions);
  }, [tasks]);

  // Generate hour labels
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto relative">
      <div className="relative" style={{ height: `${TOTAL_HEIGHT}px`, minWidth: '100%' }}>
        {/* Hour rows */}
        {hours.map(hour => (
          <div
            key={hour}
            className="absolute w-full flex border-b border-white/5"
            style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          >
            {/* Time label */}
            <div className="w-16 flex-shrink-0 px-2 pt-0 text-right border-r border-white/5">
              <span className="text-[10px] font-mono text-slate-500 relative -top-2">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>

            {/* Time slot area */}
            <div className="flex-1 hover:bg-slate-800/20 transition-colors" />
          </div>
        ))}

        {/* Task blocks */}
        <div className="absolute inset-0 ml-16">
          {taskPositions.map(pos => {
            const gap = 2;
            const colWidth = `calc((100% - ${(pos.totalColumns - 1) * gap}px) / ${pos.totalColumns})`;
            const leftOffset = `calc((100% - ${(pos.totalColumns - 1) * gap}px) / ${pos.totalColumns} * ${pos.column} + ${pos.column * gap}px + 4px)`;
            const blockWidth = `calc((100% - ${(pos.totalColumns - 1) * gap}px) / ${pos.totalColumns} - 8px)`;

            return (
              <TimelineBlock
                key={pos.task.id}
                task={pos.task}
                top={pos.top}
                height={pos.height}
                left={leftOffset}
                width={blockWidth}
                onClick={() => onTaskClick(pos.task)}
                isAiWorking={workingTaskIds.includes(pos.task.id)}
              />
            );
          })}
        </div>

        {/* Current time indicator */}
        {currentTimeOffset !== null && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${currentTimeOffset}px` }}
          >
            <div className="flex items-center">
              <div className="w-16 flex justify-end pr-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
              </div>
              <div className="flex-1 h-[2px] bg-red-500 shadow-lg shadow-red-500/30" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
