'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus, TaskPriority, TaskUpdateRequest } from '@/types/task';
import { COLUMNS, PRIORITY_CONFIG } from '@/types/task';

interface TaskSidebarProps {
  task: Task | null;
  onClose: () => void;
  onSave: (id: string, data: TaskUpdateRequest) => Promise<Task | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function TaskSidebar({ task, onClose, onSave, onDelete }: TaskSidebarProps) {
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        tags: task.tags,
        description: task.description,
        requirements: task.requirements,
        feedback: task.feedback,
      });
      setHasChanges(false);
    }
  }, [task]);

  // Handle field changes
  const handleChange = useCallback((field: keyof Task, value: unknown) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!task || !hasChanges) return;

    setIsSaving(true);
    try {
      await onSave(task.id, editedTask);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [task, editedTask, hasChanges, onSave]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!task) return;

    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await onDelete(task.id);
      if (success) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [task, onDelete, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSave]);

  if (!task) return null;

  const column = COLUMNS.find((c) => c.id === task.status);
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl z-50 flex flex-col bg-slate-950 border-l border-white/5 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-slate-900/80 to-slate-950">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${column?.color.replace('text-', 'bg-')} animate-pulse`} />
            <span className={`text-xs font-mono uppercase tracking-wider ${column?.color}`}>
              {column?.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Unsaved indicator */}
            {hasChanges && (
              <span className="px-2 py-0.5 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full uppercase tracking-wider">
                Unsaved
              </span>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={editedTask.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/5 rounded-lg text-lg font-medium text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              placeholder="Task title..."
            />
          </div>

          {/* Status & Priority row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                value={editedTask.status || task.status}
                onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.icon} {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                Priority
              </label>
              <select
                value={editedTask.priority || task.priority}
                onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Assignee
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange('assignee', 'user')}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-mono transition-all ${
                  editedTask.assignee === 'user'
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                    : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                👤 User
              </button>
              <button
                type="button"
                onClick={() => handleChange('assignee', 'ai-agent')}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-mono transition-all ${
                  editedTask.assignee === 'ai-agent'
                    ? 'bg-violet-500/10 border-violet-500/50 text-violet-400'
                    : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                🤖 AI Agent
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={(editedTask.tags || []).join(', ')}
              onChange={(e) => handleChange('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
              placeholder="backend, api, auth..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={editedTask.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
              placeholder="Describe the task..."
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Requirements
            </label>
            <textarea
              value={editedTask.requirements || ''}
              onChange={(e) => handleChange('requirements', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all resize-none font-mono text-xs"
              placeholder="- Requirement 1&#10;- Requirement 2"
            />
          </div>

          {/* Feedback (for NEED_FIX) */}
          {(task.status === 'NEED_FIX' || task.status === 'IN_REVIEW') && (
            <div>
              <label className="block text-[10px] font-mono text-orange-400 uppercase tracking-wider mb-2">
                Feedback
              </label>
              <textarea
                value={editedTask.feedback || ''}
                onChange={(e) => handleChange('feedback', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-orange-900/10 border border-orange-500/20 rounded-lg text-sm text-white placeholder-orange-400/50 focus:outline-none focus:border-orange-500/50 transition-all resize-none"
                placeholder="Provide feedback for the AI agent..."
              />
            </div>
          )}

          {/* AI Work Log (read-only) */}
          {task.aiWorkLog && (
            <div>
              <label className="block text-[10px] font-mono text-violet-400 uppercase tracking-wider mb-2">
                AI Work Log
              </label>
              <div className="px-4 py-3 bg-violet-900/10 border border-violet-500/20 rounded-lg text-sm text-slate-300 font-mono whitespace-pre-wrap">
                {task.aiWorkLog}
              </div>
            </div>
          )}

          {/* File path */}
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="truncate">{task.filePath}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-slate-600">
              <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(task.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-900/50">
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-all disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Task'}
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={`
              px-6 py-2 rounded-lg text-sm font-mono font-medium
              transition-all
              ${hasChanges
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
              disabled:opacity-50
            `}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
