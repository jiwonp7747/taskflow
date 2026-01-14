/**
 * AI Worker IPC Handler
 *
 * AI Worker 제어를 위한 IPC 핸들러
 */

import { ipcMain } from 'electron';
import type { AIWorkerConfig, AIWorkerStatus, TaskExecutionLog } from '../../types/ai';
import type { QueueItem } from '../../shared/types/ipc.types';
import {
  startWorker,
  stopWorker,
  pauseWorker,
  resumeWorker,
  getWorkerStatus,
  getTaskQueue,
  getExecutionLog,
} from '../services/aiWorker.service';

/**
 * Register AI Worker IPC handlers
 */
export function registerAIWorkerIPC(): void {
  // Start AI Worker
  ipcMain.handle(
    'ai:start',
    async (
      _event,
      config?: Partial<AIWorkerConfig>
    ): Promise<AIWorkerStatus> => {
      try {
        return await startWorker(config || undefined);
      } catch (error) {
        console.error('[AI-IPC] Failed to start worker:', error);
        throw error;
      }
    }
  );

  // Stop AI Worker
  ipcMain.handle('ai:stop', async (): Promise<AIWorkerStatus> => {
    try {
      return stopWorker();
    } catch (error) {
      console.error('[AI-IPC] Failed to stop worker:', error);
      throw error;
    }
  });

  // Pause AI Worker
  ipcMain.handle('ai:pause', async (): Promise<AIWorkerStatus> => {
    try {
      return pauseWorker();
    } catch (error) {
      console.error('[AI-IPC] Failed to pause worker:', error);
      throw error;
    }
  });

  // Resume AI Worker
  ipcMain.handle('ai:resume', async (): Promise<AIWorkerStatus> => {
    try {
      return resumeWorker();
    } catch (error) {
      console.error('[AI-IPC] Failed to resume worker:', error);
      throw error;
    }
  });

  // Get AI Worker status
  ipcMain.handle('ai:getStatus', async (): Promise<AIWorkerStatus> => {
    try {
      return getWorkerStatus();
    } catch (error) {
      console.error('[AI-IPC] Failed to get status:', error);
      throw error;
    }
  });

  // Get task queue
  ipcMain.handle('ai:getQueue', async (): Promise<QueueItem[]> => {
    try {
      return getTaskQueue();
    } catch (error) {
      console.error('[AI-IPC] Failed to get queue:', error);
      throw error;
    }
  });

  // Get execution logs for a task
  ipcMain.handle(
    'ai:getLogs',
    async (
      _event,
      { taskId }: { taskId: string }
    ): Promise<TaskExecutionLog | null> => {
      try {
        return getExecutionLog(taskId);
      } catch (error) {
        console.error(`[AI-IPC] Failed to get logs for task ${taskId}:`, error);
        throw error;
      }
    }
  );

  console.log('[AI-IPC] Handlers registered');
}
