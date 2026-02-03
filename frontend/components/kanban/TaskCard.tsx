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
    return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-400', bg: 'bg-red-500/10' };
  } else if (diffDays === 0) {
    return { text: 'Due today', color: 'text-amber-400', bg: 'bg-amber-500/10' };
  } else if (diffDays === 1) {
    return { text: 'Tomorrow', color: 'text-amber-400', bg: 'bg-amber-500/10' };
  } else if (diffDays <= 7) {
    return { text: `${diffDays}d left`, color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
  } else {
    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-slate-400',
      bg: 'bg-slate-800/50',
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
        rounded-lg border border-white/5
        bg-gradient-to-br from-slate-900/90 to-slate-950/80
        backdrop-blur-sm
        p-4 mb-2
        transition-all duration-300 ease-out
        hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10
        hover:translate-y-[-2px]
        ${dragging ? 'opacity-50 scale-105 rotate-2 shadow-2xl shadow-cyan-500/20' : ''}
        ${isAiWorking ? 'border-cyan-400/50 animate-pulse' : ''}
      `}
    >
      {/* Scan line effect on hover */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-scan" />
      </div>

      {/* AI Working indicator */}
      {isAiWorking && (
        <div className="absolute -top-1 -right-1 flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/30 rounded-full">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Executing</span>
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
              <div className={`w-2 h-2 rounded-full ${isAiWorking ? 'bg-cyan-400 animate-pulse' : 'bg-violet-400'}`} />
              <span className="text-[10px] font-mono text-violet-400/80 uppercase">AI</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-slate-200 line-clamp-2 mb-2 group-hover:text-cyan-100 transition-colors">
          {task.title}
        </h3>

        {/* Footer: File path, Due date & Tags */}
        <div className="space-y-2">
          {/* File path indicator */}
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 truncate">
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
                  className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400/80 bg-slate-800/50 rounded border border-slate-700/50"
                >
                  #{tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Glow effect on drag */}
      {dragging && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 animate-gradient-x" />
      )}
    </div>
  );
}

// Overlay version for drag preview
export function TaskCardOverlay({ task }: { task: Task }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div className="w-64 rounded-lg border border-cyan-500/50 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl shadow-cyan-500/30 rotate-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${priorityConfig.bgColor} ${priorityConfig.color}`}>
          {priorityConfig.label}
        </span>
      </div>
      <h3 className="text-sm font-medium text-cyan-100 line-clamp-2">
        {task.title}
      </h3>
    </div>
  );
}
