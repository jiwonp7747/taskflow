'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Task, TaskFilter, DatePreset, TaskAssignee } from '@/types/task';

interface UseTaskFilterReturn {
  filter: TaskFilter;
  filteredTasks: Task[];
  setTagFilter: (tags: string[]) => void;
  setAssigneeFilter: (assignee: TaskAssignee | 'all') => void;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDateRange: (startDate: string, endDate: string) => void;
  clearFilters: () => void;
  availableTags: string[];
  isFiltered: boolean;
}

const DEFAULT_FILTER: TaskFilter = {
  tags: [],
  assignee: 'all',
  dateRange: { type: 'all' },
};

export function useTaskFilter(tasks: Task[]): UseTaskFilterReturn {
  const [filter, setFilter] = useState<TaskFilter>(DEFAULT_FILTER);

  // Extract all unique tags from tasks
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => task.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tasks]);

  // Calculate date range based on preset
  const getDateRange = useCallback((type: DatePreset): { start?: Date; end?: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (type) {
      case 'today': {
        const endOfDay = new Date(today);
        endOfDay.setDate(today.getDate() + 1);
        return { start: today, end: endOfDay };
      }
      case 'this_week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return { start: weekStart, end: weekEnd };
      }
      case 'this_month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return { start: monthStart, end: monthEnd };
      }
      case 'overdue':
        return { end: today };
      default:
        return {};
    }
  }, []);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Tag filter
      if (filter.tags && filter.tags.length > 0) {
        if (!filter.tags.some(tag => task.tags.includes(tag))) {
          return false;
        }
      }

      // Assignee filter
      if (filter.assignee && filter.assignee !== 'all') {
        if (task.assignee !== filter.assignee) {
          return false;
        }
      }

      // Date filter (based on due_date)
      if (filter.dateRange && filter.dateRange.type !== 'all') {
        // If filtering by date but task has no due_date, exclude it
        if (!task.due_date) return false;

        const taskDueDate = new Date(task.due_date);

        if (filter.dateRange.type === 'custom') {
          const start = filter.dateRange.startDate ? new Date(filter.dateRange.startDate) : null;
          const end = filter.dateRange.endDate ? new Date(filter.dateRange.endDate) : null;

          if (start && taskDueDate < start) return false;
          if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            if (taskDueDate > endOfDay) return false;
          }
        } else {
          const range = getDateRange(filter.dateRange.type);
          if (range.start && taskDueDate < range.start) return false;
          if (range.end && taskDueDate > range.end) return false;
        }
      }

      return true;
    });
  }, [tasks, filter, getDateRange]);

  // Check if any filter is active
  const isFiltered = useMemo(() => {
    return (
      (filter.tags && filter.tags.length > 0) ||
      (filter.assignee && filter.assignee !== 'all') ||
      (filter.dateRange && filter.dateRange.type !== 'all')
    );
  }, [filter]);

  // Setter functions
  const setTagFilter = useCallback((tags: string[]) => {
    setFilter(prev => ({ ...prev, tags }));
  }, []);

  const setAssigneeFilter = useCallback((assignee: TaskAssignee | 'all') => {
    setFilter(prev => ({ ...prev, assignee }));
  }, []);

  const setDatePreset = useCallback((preset: DatePreset) => {
    setFilter(prev => ({
      ...prev,
      dateRange: { type: preset },
    }));
  }, []);

  const setCustomDateRange = useCallback((startDate: string, endDate: string) => {
    setFilter(prev => ({
      ...prev,
      dateRange: {
        type: 'custom',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, []);

  return {
    filter,
    filteredTasks,
    setTagFilter,
    setAssigneeFilter,
    setDatePreset,
    setCustomDateRange,
    clearFilters,
    availableTags,
    isFiltered,
  };
}
