'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, ColumnConfig } from '@/types/task';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  column: ColumnConfig;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  workingTaskIds?: string[];
}

export function TaskColumn({ column, tasks, onTaskClick, workingTaskIds = [] }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const isExecuting = column.id === 'IN_PROGRESS';
  const isEmpty = tasks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col min-w-[280px] max-w-[320px] w-full
        rounded-xl border border-[var(--glass-border)]
        bg-[var(--card-bg)] backdrop-blur-sm
        transition-all duration-300
        ${isOver ? `ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] ring-${column.color.replace('text-', '')}/50 shadow-lg ${column.glowColor}` : ''}
      `}
    >
      {/* Column Header */}
      <div className={`
        sticky top-0 z-10
        flex items-center justify-between
        px-4 py-3
        border-b border-[var(--glass-border)]
        bg-[var(--glass-bg)] backdrop-blur-md
        rounded-t-xl
      `}>
        <div className="flex items-center gap-2">
          {/* Status icon with glow */}
          <div
            className={`
              flex items-center justify-center
              w-7 h-7 rounded-lg
              ${column.color}
              bg-current/10
              border border-current/20
              ${isExecuting ? 'animate-pulse' : ''}
            `}
            style={{ filter: 'var(--icon-glow)' }}
          >
            <span className="text-sm" style={{ filter: 'var(--icon-glow)' }}>{column.icon}</span>
          </div>

          {/* Column title */}
          <div>
            <h2 className={`text-xs font-mono font-bold uppercase tracking-widest ${column.color}`}>
              {column.title}
            </h2>
            <div className="flex items-center gap-1 mt-0.5">
              <div className={`w-1 h-1 rounded-full bg-current ${column.color} ${isExecuting ? 'animate-ping' : ''}`} />
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Live indicator for executing column */}
        {isExecuting && tasks.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-[var(--neon-cyan)] rounded-full animate-pulse" />
            <span className="text-[9px] font-mono text-[var(--neon-cyan)] uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>

      {/* Drop zone indicator */}
      {isOver && (
        <div className="mx-3 mt-3 p-3 border-2 border-dashed border-[var(--neon-cyan)]/50 rounded-lg bg-[var(--neon-cyan)]/5">
          <div className="flex items-center justify-center gap-2 text-[var(--neon-cyan)]">
            <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-xs font-mono uppercase tracking-wider">Drop here</span>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--text-tertiary,#64748b)]/50">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              isAiWorking={workingTaskIds.includes(task.id)}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {isEmpty && !isOver && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div
              className={`w-12 h-12 rounded-xl ${column.color} bg-current/5 border border-current/10 flex items-center justify-center mb-3`}
              style={{ filter: 'var(--icon-glow)' }}
            >
              <span className="text-2xl opacity-30" style={{ filter: 'var(--icon-glow)' }}>{column.icon}</span>
            </div>
            <p className="text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
              No tasks
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Drag tasks here or create new
            </p>
          </div>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="h-4 bg-gradient-to-t from-[var(--bg-primary,#020617)]/50 to-transparent rounded-b-xl pointer-events-none" />
    </div>
  );
}
