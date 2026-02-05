'use client';

import type { Task } from '@/types/task';
import { CalendarTaskChip } from '@/components/calendar/CalendarTaskChip';

interface TimelineAllDayProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  workingTaskIds: string[];
}

export function TimelineAllDay({
  tasks,
  onTaskClick,
  workingTaskIds,
}: TimelineAllDayProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
      <div className="flex">
        {/* Label */}
        <div className="w-16 flex-shrink-0 px-2 py-2 text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider border-r border-[var(--glass-border)]">
          All day
        </div>

        {/* All-day task chips */}
        <div className="flex-1 flex flex-wrap gap-1 px-3 py-2">
          {tasks.map(task => (
            <div key={task.id} className="max-w-[200px]">
              <CalendarTaskChip
                task={task}
                onClick={() => onTaskClick(task)}
                isAiWorking={workingTaskIds.includes(task.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
