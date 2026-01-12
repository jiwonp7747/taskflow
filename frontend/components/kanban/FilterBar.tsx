'use client';

import { useState } from 'react';
import type { TaskFilter, DatePreset, TaskAssignee } from '@/types/task';

interface FilterBarProps {
  filter: TaskFilter;
  availableTags: string[];
  onTagsChange: (tags: string[]) => void;
  onAssigneeChange: (assignee: TaskAssignee | 'all') => void;
  onDatePresetChange: (preset: DatePreset) => void;
  onCustomDateRange: (startDate: string, endDate: string) => void;
  onClearFilters: () => void;
  isFiltered: boolean;
  totalTasks: number;
  filteredCount: number;
}

const DATE_PRESETS: { value: DatePreset; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '' },
  { value: 'today', label: 'Today', icon: '' },
  { value: 'this_week', label: 'This Week', icon: '' },
  { value: 'this_month', label: 'This Month', icon: '' },
  { value: 'overdue', label: 'Overdue', icon: '' },
  { value: 'custom', label: 'Custom', icon: '' },
];

export function FilterBar({
  filter,
  availableTags,
  onTagsChange,
  onAssigneeChange,
  onDatePresetChange,
  onCustomDateRange,
  onClearFilters,
  isFiltered,
  totalTasks,
  filteredCount,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handleDatePresetChange = (preset: DatePreset) => {
    onDatePresetChange(preset);
    if (preset !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    onCustomDateRange(start, end);
  };

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-xl mb-4 overflow-hidden">
      {/* Collapsed view: Filter button with indicator */}
      <div className="flex items-center justify-between p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          {/* Filter icon */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-mono">Filters</span>

          {isFiltered && (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
              {filteredCount}/{totalTasks}
            </span>
          )}

          {/* Chevron */}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isFiltered && (
          <button
            onClick={onClearFilters}
            className="text-xs font-mono text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Tag filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      const newTags = filter.tags?.includes(tag)
                        ? filter.tags.filter(t => t !== tag)
                        : [...(filter.tags || []), tag];
                      onTagsChange(newTags);
                    }}
                    className={`px-2 py-1 text-xs font-mono rounded-lg border transition-all ${
                      filter.tags?.includes(tag)
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assignee filter */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Assignee
            </label>
            <div className="flex gap-2">
              {(['all', 'user', 'ai-agent'] as const).map(assignee => (
                <button
                  key={assignee}
                  onClick={() => onAssigneeChange(assignee)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                    filter.assignee === assignee
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                  }`}
                >
                  {assignee === 'all' ? 'All' : assignee === 'user' ? 'User' : 'AI Agent'}
                </button>
              ))}
            </div>
          </div>

          {/* Date filter */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Due Date
            </label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => handleDatePresetChange(preset.value)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                    filter.dateRange?.type === preset.value
                      ? preset.value === 'overdue'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom date range picker */}
            {filter.dateRange?.type === 'custom' && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                  className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white
                    focus:outline-none focus:border-cyan-500/50 [color-scheme:dark]"
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                  className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white
                    focus:outline-none focus:border-cyan-500/50 [color-scheme:dark]"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
