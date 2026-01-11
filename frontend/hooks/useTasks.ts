'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Task, TaskStatus, TaskUpdateRequest, TaskCreateRequest } from '@/types/task';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (data: TaskCreateRequest) => Promise<Task | null>;
  updateTask: (id: string, data: TaskUpdateRequest) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  moveTask: (id: string, newStatus: TaskStatus) => Promise<boolean>;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new task
  const createTask = useCallback(async (data: TaskCreateRequest): Promise<Task | null> => {
    try {
      setError(null);

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const result = await response.json();
      const newTask = result.task;

      // Optimistic update
      setTasks((prev) => [newTask, ...prev]);

      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  // Update a task
  const updateTask = useCallback(async (id: string, data: TaskUpdateRequest): Promise<Task | null> => {
    try {
      setError(null);

      // Optimistic update
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, ...data, updated_at: new Date().toISOString() } : task
        )
      );

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Revert on error
        await fetchTasks();
        throw new Error('Failed to update task');
      }

      const result = await response.json();
      return result.task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [fetchTasks]);

  // Delete a task
  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      // Optimistic update
      setTasks((prev) => prev.filter((task) => task.id !== id));

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert on error
        await fetchTasks();
        throw new Error('Failed to delete task');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [fetchTasks]);

  // Move task to a new status (convenience method)
  const moveTask = useCallback(async (id: string, newStatus: TaskStatus): Promise<boolean> => {
    const result = await updateTask(id, { status: newStatus });
    return result !== null;
  }, [updateTask]);

  // Get tasks filtered by status
  const getTasksByStatus = useCallback((status: TaskStatus): Task[] => {
    return tasks.filter((task) => task.status === status);
  }, [tasks]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksByStatus,
  };
}
