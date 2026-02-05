'use client';

import { useState, useCallback } from 'react';
import type { TaskPriority, TaskCreateRequest } from '@/types/task';
import { PRIORITY_CONFIG } from '@/types/task';
import { DatePicker } from '@/components/ui/DatePicker';
import { useDuplicateTitle } from '@/hooks/useDuplicateTitle';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: TaskCreateRequest) => Promise<unknown>;
  availableTags?: string[];
}

export function CreateTaskModal({ isOpen, onClose, onCreate, availableTags = [] }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assignee, setAssignee] = useState<'user' | 'ai-agent'>('user');
  const [tags, setTags] = useState('');
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Check for duplicate title
  const { isDuplicate, isChecking } = useDuplicateTitle(title);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      await onCreate({
        title: title.trim(),
        priority,
        assignee,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        start_date: startDate,
        due_date: dueDate,
        content,
      });

      // Reset form
      setTitle('');
      setPriority('MEDIUM');
      setAssignee('user');
      setTags('');
      setStartDate(undefined);
      setDueDate(undefined);
      setContent('');
      onClose();
    } finally {
      setIsCreating(false);
    }
  }, [title, priority, assignee, tags, startDate, dueDate, content, onCreate, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--modal-backdrop)] backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="w-full max-w-lg bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-2xl shadow-2xl shadow-[var(--primary)]/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--modal-border)] bg-[var(--modal-header-bg)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-medium text-[var(--text-primary)]">Initialize New Task</h2>
                <p className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Create a new markdown task file</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-4 py-3 bg-[var(--input-bg)] border rounded-lg text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 transition-all ${
                  isDuplicate
                    ? 'border-orange-500/50 focus:border-orange-500/70 focus:ring-orange-500/20'
                    : 'border-[var(--input-border)] focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/20'
                }`}
                placeholder="Enter task title..."
                autoFocus
              />
              {/* Duplicate warning */}
              {isDuplicate && title.trim() && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs text-orange-300 font-mono">
                    A task with this title already exists today. Please use a different title.
                  </span>
                </div>
              )}
              {/* Checking indicator */}
              {isChecking && title.trim() && (
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-secondary)] font-mono">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Checking...</span>
                </div>
              )}
            </div>

            {/* Priority & Assignee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Priority
                </label>
                <div className="flex gap-1">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPriority(key as TaskPriority)}
                      className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all ${
                        priority === key
                          ? `${config.bgColor} ${config.color} border border-current/30`
                          : 'bg-[var(--input-bg)] text-[var(--text-tertiary)] border border-[var(--input-border)] hover:border-[var(--input-border-hover)]'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Assignee
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignee('user')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                      assignee === 'user'
                        ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/50 text-[var(--primary)]'
                        : 'bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-secondary)] hover:border-[var(--input-border-hover)]'
                    }`}
                  >
                    👤 User
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignee('ai-agent')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                      assignee === 'ai-agent'
                        ? 'bg-violet-500/10 border border-violet-500/50 text-violet-400'
                        : 'bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-secondary)] hover:border-[var(--input-border-hover)]'
                    }`}
                  >
                    🤖 AI
                  </button>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary)]/50 transition-all"
                placeholder="backend, api, auth..."
              />
              {/* Tag suggestions - wrap to multiple lines */}
              {availableTags.length > 0 && (() => {
                const currentTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
                return (
                <div className="mt-2 max-h-[4.5rem] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--text-tertiary)]/50">
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((tag) => {
                      const isSelected = currentTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              // Remove tag
                              const newTags = currentTags.filter((t) => t !== tag);
                              setTags(newTags.join(', '));
                            } else {
                              // Add tag
                              const newTags = [...currentTags, tag];
                              setTags(newTags.join(', '));
                            }
                          }}
                          className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
                            isSelected
                              ? 'bg-[var(--primary)]/20 border-[var(--primary)]/50 text-[var(--primary)]'
                              : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-secondary)] hover:border-[var(--input-border-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
                );
              })()}
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                maxDate={dueDate}
                showTime
              />
              <DatePicker
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
                minDate={startDate}
                showTime
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary)]/50 transition-all resize-none"
                placeholder="Task content..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--modal-border)] bg-[var(--modal-footer-bg)]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || isCreating || isDuplicate}
              className="px-6 py-2 rounded-lg text-sm font-mono font-medium bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
