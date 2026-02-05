'use client';

import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@/types/task';
import { PRIORITY_CONFIG, COLUMNS } from '@/types/task';

interface CalendarTaskChipProps {
  task: Task;
  onClick: () => void;
  isAiWorking?: boolean;
}

export function CalendarTaskChip({ task, onClick, isAiWorking = false }: CalendarTaskChipProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const statusConfig = COLUMNS.find(col => col.id === task.status);

  // Make this chip draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  // Get priority dot color
  const getPriorityDotColor = () => {
    switch (task.priority) {
      case 'URGENT': return 'bg-[var(--priority-urgent-dot)]';
      case 'HIGH': return 'bg-[var(--priority-high-dot)]';
      case 'MEDIUM': return 'bg-[var(--priority-medium-dot)]';
      case 'LOW': return 'bg-[var(--priority-low-dot)]';
      default: return 'bg-[var(--priority-low-dot)]';
    }
  };

  // Get status bar color
  const getStatusBarColor = () => {
    switch (task.status) {
      case 'TODO': return 'bg-[var(--status-todo-border)]';
      case 'IN_PROGRESS': return 'bg-[var(--status-in-progress-border)]';
      case 'IN_REVIEW': return 'bg-[var(--status-in-review-border)]';
      case 'NEED_FIX': return 'bg-[var(--status-need-fix-border)]';
      case 'COMPLETE': return 'bg-[var(--status-complete-border)]';
      case 'ON_HOLD': return 'bg-[var(--status-on-hold-border)]';
      default: return 'bg-[var(--status-todo-border)]';
    }
  };

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`
        w-full group flex items-center gap-1 px-1.5 py-1 rounded
        text-left text-[10px] leading-tight
        bg-[var(--glass-bg)] border border-[var(--glass-border)]
        hover:border-[var(--accent-primary)]/30 hover:bg-[var(--muted-bg)]
        transition-all duration-200
        ${isAiWorking ? 'border-[var(--neon-cyan)]/50 animate-pulse' : ''}
        ${isDragging ? 'opacity-30 scale-95' : ''}
      `}
      title={`${task.title} (${priorityConfig.label} / ${task.status})`}
    >
      {/* Priority indicator dot */}
      <div
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPriorityDotColor()}`}
        title={priorityConfig.label}
      />

      {/* Status indicator (small colored bar on left edge) */}
      <div
        className={`w-0.5 h-3 rounded-full flex-shrink-0 ${getStatusBarColor()}`}
        title={task.status}
      />

      {/* Title (truncated) */}
      <span className="flex-1 truncate text-[var(--text-secondary)] group-hover:text-[var(--foreground)]">
        {task.title}
      </span>

      {/* AI indicator */}
      {task.assignee === 'ai-agent' && (
        <span className="text-[8px] text-violet-400 flex-shrink-0">AI</span>
      )}
    </button>
  );
}
