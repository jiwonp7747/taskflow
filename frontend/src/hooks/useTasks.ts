/**
 * useTasks Hook for Electron
 *
 * IPC를 통한 태스크 관리 훅
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  Task,
  TaskStatus,
  TaskUpdateRequest,
  TaskCreateRequest,
} from '@/types/task';
import * as ipc from '../lib/ipcClient';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  noSource: boolean;
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
  const [noSource, setNoSource] = useState(false);

  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoSource(false);

      const taskList = await ipc.getTasks();

      // If empty, might be no source configured
      if (taskList.length === 0) {
        const config = await ipc.getConfig();
        if (!config.activeSourceId) {
          setNoSource(true);
        }
      }

      setTasks(taskList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('No active source')) {
        setNoSource(true);
        setTasks([]);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new task
  const createTask = useCallback(
    async (data: TaskCreateRequest): Promise<Task | null> => {
      try {
        setError(null);

        const newTask = await ipc.createTask(data);

        // Optimistic update
        setTasks((prev) => [newTask, ...prev]);

        return newTask;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      }
    },
    []
  );

  // Update a task
  const updateTask = useCallback(
    async (id: string, data: TaskUpdateRequest): Promise<Task | null> => {
      try {
        setError(null);

        // Optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id
              ? { ...task, ...data, updated_at: new Date().toISOString() }
              : task
          )
        );

        const updatedTask = await ipc.updateTask(id, data);

        // Update with actual result
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updatedTask : task))
        );

        return updatedTask;
      } catch (err) {
        // Revert on error
        await fetchTasks();
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      }
    },
    [fetchTasks]
  );

  // Delete a task
  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        // Optimistic update
        setTasks((prev) => prev.filter((task) => task.id !== id));

        await ipc.deleteTask(id);

        return true;
      } catch (err) {
        // Revert on error
        await fetchTasks();
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [fetchTasks]
  );

  // Move task to a new status
  const moveTask = useCallback(
    async (id: string, newStatus: TaskStatus): Promise<boolean> => {
      const result = await updateTask(id, { status: newStatus });
      return result !== null;
    },
    [updateTask]
  );

  // Get tasks filtered by status
  const getTasksByStatus = useCallback(
    (status: TaskStatus): Task[] => {
      return tasks.filter((task) => task.status === status);
    },
    [tasks]
  );

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Subscribe to file changes
  useEffect(() => {
    const unsubscribe = ipc.onFileChanged((event) => {
      console.log('[useTasks] File changed:', event);
      // Refetch on file change
      fetchTasks();
    });

    return unsubscribe;
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    noSource,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksByStatus,
  };
}
