'use client';

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

  // Get priority dot color
  const getPriorityDotColor = () => {
    switch (task.priority) {
      case 'URGENT': return 'bg-red-400';
      case 'HIGH': return 'bg-orange-400';
      case 'MEDIUM': return 'bg-blue-400';
      case 'LOW': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  // Get status bar color
  const getStatusBarColor = () => {
    switch (task.status) {
      case 'TODO': return 'bg-slate-400';
      case 'IN_PROGRESS': return 'bg-cyan-400';
      case 'IN_REVIEW': return 'bg-violet-400';
      case 'NEED_FIX': return 'bg-orange-400';
      case 'COMPLETE': return 'bg-emerald-400';
      case 'ON_HOLD': return 'bg-amber-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full group flex items-center gap-1 px-1.5 py-1 rounded
        text-left text-[10px] leading-tight
        bg-slate-800/60 border border-white/5
        hover:border-cyan-500/30 hover:bg-slate-700/60
        transition-all duration-200
        ${isAiWorking ? 'border-cyan-400/50 animate-pulse' : ''}
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
      <span className="flex-1 truncate text-slate-300 group-hover:text-white">
        {task.title}
      </span>

      {/* AI indicator */}
      {task.assignee === 'ai-agent' && (
        <span className="text-[8px] text-violet-400 flex-shrink-0">AI</span>
      )}
    </button>
  );
}
