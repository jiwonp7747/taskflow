/**
 * Tasks IPC Handler
 *
 * 태스크 CRUD 작업을 위한 IPC 핸들러
 */

import { ipcMain } from 'electron';
import type { Task, TaskCreateRequest, TaskUpdateRequest } from '../../types/task';
import { getDatabase } from '../services/database.service';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../lib/fileSystem';

/**
 * Get active source directory from database
 */
function getActiveSourceDir(): string | null {
  const db = getDatabase();

  const config = db
    .prepare('SELECT active_source_id FROM config WHERE id = 1')
    .get() as { active_source_id: string | null } | undefined;

  if (!config?.active_source_id) {
    return null;
  }

  const source = db
    .prepare('SELECT path FROM sources WHERE id = ?')
    .get(config.active_source_id) as { path: string } | undefined;

  return source?.path || null;
}

/**
 * Ensure active source exists
 */
function requireActiveSource(): string {
  const dir = getActiveSourceDir();
  if (!dir) {
    throw new Error('No active source selected. Please select a task source first.');
  }
  return dir;
}

/**
 * Register Tasks IPC handlers
 */
export function registerTasksIPC(): void {
  // Get all tasks
  ipcMain.handle('tasks:getAll', async (): Promise<Task[]> => {
    const dir = getActiveSourceDir();
    if (!dir) {
      return [];
    }

    try {
      return await getAllTasks(dir);
    } catch (error) {
      console.error('[TasksIPC] Failed to get all tasks:', error);
      throw error;
    }
  });

  // Get task by ID
  ipcMain.handle(
    'tasks:getById',
    async (_event, { id }: { id: string }): Promise<Task | null> => {
      const dir = requireActiveSource();

      try {
        return await getTaskById(id, dir);
      } catch (error) {
        console.error(`[TasksIPC] Failed to get task ${id}:`, error);
        throw error;
      }
    }
  );

  // Create new task
  ipcMain.handle(
    'tasks:create',
    async (_event, data: TaskCreateRequest): Promise<Task> => {
      const dir = requireActiveSource();

      try {
        const task = await createTask(data, dir);
        console.log('[TasksIPC] Task created:', task.id);
        return task;
      } catch (error) {
        console.error('[TasksIPC] Failed to create task:', error);
        throw error;
      }
    }
  );

  // Update task
  ipcMain.handle(
    'tasks:update',
    async (
      _event,
      { id, data }: { id: string; data: TaskUpdateRequest }
    ): Promise<Task> => {
      const dir = requireActiveSource();

      try {
        const task = await updateTask(id, data, dir);
        console.log('[TasksIPC] Task updated:', task.id);
        return task;
      } catch (error) {
        console.error(`[TasksIPC] Failed to update task ${id}:`, error);
        throw error;
      }
    }
  );

  // Delete task
  ipcMain.handle(
    'tasks:delete',
    async (_event, { id }: { id: string }): Promise<void> => {
      const dir = requireActiveSource();

      try {
        await deleteTask(id, dir);
        console.log('[TasksIPC] Task deleted:', id);
      } catch (error) {
        console.error(`[TasksIPC] Failed to delete task ${id}:`, error);
        throw error;
      }
    }
  );

  console.log('[TasksIPC] Handlers registered');
}
