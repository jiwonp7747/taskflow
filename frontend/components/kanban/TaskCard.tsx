'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/types/task';
import { PRIORITY_CONFIG } from '@/types/task';

// Helper function for due date formatting with color coding
function formatDueDate(dateStr?: string): { text: string; color: string; bg: string } | null {
  if (!dateStr) return null;

  // Parse as local time (append T00:00:00 for date-only strings to avoid UTC interpretation)
  const stripped = dateStr.replace(/Z$/, '');
  const date = new Date(stripped.includes('T') ? stripped : stripped + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-[var(--status-error)]', bg: 'bg-[var(--status-error)]/10' };
  } else if (diffDays === 0) {
    return { text: 'Due today', color: 'text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/10' };
  } else if (diffDays === 1) {
    return { text: 'Tomorrow', color: 'text-[var(--status-warning)]', bg: 'bg-[var(--status-warning)]/10' };
  } else if (diffDays <= 7) {
    return { text: `${diffDays}d left`, color: 'text-[var(--neon-cyan)]', bg: 'bg-[var(--neon-cyan)]/10' };
  } else {
    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-[var(--text-tertiary)]',
      bg: 'bg-[var(--muted-bg)]',
    };
  }
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
  isAiWorking?: boolean;
}

export function TaskCard({ task, onClick, isDragging = false, isAiWorking = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const isAgentTask = task.assignee === 'ai-agent';
  const dragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        group relative cursor-pointer select-none
        rounded-lg border border-[var(--glass-border)]
        bg-[var(--card-bg)]
        backdrop-blur-sm
        p-4 mb-2
        transition-all duration-300 ease-out
        hover:border-[var(--accent-primary)]/30 hover:shadow-lg hover:shadow-[var(--accent-primary)]/10
        hover:translate-y-[-2px]
        ${dragging ? 'opacity-50 scale-105 rotate-2 shadow-2xl shadow-[var(--accent-primary)]/20' : ''}
        ${isAiWorking ? 'border-[var(--neon-cyan)]/50 animate-pulse' : ''}
      `}
    >
      {/* Scan line effect on hover */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent-primary)]/5 to-transparent animate-scan" />
      </div>

      {/* AI Working indicator */}
      {isAiWorking && (
        <div className="absolute -top-1 -right-1 flex items-center gap-1 px-2 py-0.5 bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)]/30 rounded-full">
          <div className="w-1.5 h-1.5 bg-[var(--neon-cyan)] rounded-full animate-ping" />
          <span className="text-[10px] font-mono text-[var(--neon-cyan)] uppercase tracking-wider">Executing</span>
        </div>
      )}

      {/* Card content */}
      <div className="relative z-10">
        {/* Header: Priority badge & Agent indicator */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={`
              inline-flex items-center px-2 py-0.5 rounded
              text-[10px] font-mono uppercase tracking-wider
              ${priorityConfig.bgColor} ${priorityConfig.color}
              border border-current/20
            `}
          >
            {priorityConfig.label}
          </span>

          {isAgentTask && (
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isAiWorking ? 'bg-[var(--neon-cyan)] animate-pulse' : 'bg-[var(--neon-purple)]'}`} />
              <span className="text-[10px] font-mono text-[var(--neon-purple)]/80 uppercase">AI</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
          {task.title}
        </h3>

        {/* Footer: File path, Due date & Tags */}
        <div className="space-y-2">
          {/* File path indicator */}
          <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-tertiary)] truncate">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate opacity-70">{task.id}.md</span>
          </div>

          {/* Due date indicator */}
          {task.due_date && (() => {
            const dueInfo = formatDueDate(task.due_date);
            if (!dueInfo) return null;
            return (
              <div className={`flex items-center gap-1 text-[10px] font-mono ${dueInfo.color}`}>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`px-1.5 py-0.5 rounded ${dueInfo.bg}`}>{dueInfo.text}</span>
              </div>
            );
          })()}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[9px] font-mono text-[var(--tag-text)] bg-[var(--tag-bg)] border border-[var(--tag-border)] shadow-[var(--tag-shadow)]"
                  style={{ borderRadius: 'var(--tag-border-radius)' }}
                >
                  #{tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono text-[var(--text-tertiary)]">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Glow effect on drag */}
      {dragging && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--accent-primary)]/10 via-[var(--accent-secondary)]/10 to-[var(--accent-primary)]/10 animate-gradient-x" />
      )}
    </div>
  );
}

// Overlay version for drag preview
export function TaskCardOverlay({ task }: { task: Task }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div className="w-64 rounded-lg border border-[var(--accent-primary)]/50 bg-[var(--card-bg)]/95 backdrop-blur-md p-4 shadow-2xl shadow-[var(--accent-primary)]/30 rotate-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${priorityConfig.bgColor} ${priorityConfig.color}`}>
          {priorityConfig.label}
        </span>
      </div>
      <h3 className="text-sm font-medium text-[var(--accent-primary)] line-clamp-2">
        {task.title}
      </h3>
    </div>
  );
}
