/**
 * useAIWorker Hook for Electron
 *
 * IPC를 통한 AI Worker 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  AIWorkerStatus,
  AIWorkerConfig,
  LogLine,
  TaskExecutionLog,
} from '@/types/ai';
import { INITIAL_AI_WORKER_STATUS, DEFAULT_AI_WORKER_CONFIG } from '@/types/ai';
import * as ipc from '../lib/ipcClient';

interface UseAIWorkerReturn {
  // Status
  status: AIWorkerStatus;
  config: AIWorkerConfig;
  isConnected: boolean;

  // Logs
  logs: LogLine[];
  executionLogs: TaskExecutionLog[];

  // Actions
  start: () => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  clearLogs: () => void;

  // Error
  error: string | null;
}

export function useAIWorker(): UseAIWorkerReturn {
  // State
  const [status, setStatus] = useState<AIWorkerStatus>(INITIAL_AI_WORKER_STATUS);
  const [config, setConfig] = useState<AIWorkerConfig>(DEFAULT_AI_WORKER_CONFIG);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [executionLogs, setExecutionLogs] = useState<TaskExecutionLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Always connected in Electron (IPC is always available)
  const isConnected = true;

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const workerStatus = await ipc.getAIWorkerStatus();
        setStatus(workerStatus);

        // Get config from app config
        const appConfig = await ipc.getConfig();
        setConfig(appConfig.aiWorker);
      } catch (e) {
        console.error('Failed to fetch AI worker status:', e);
      }
    };

    fetchStatus();
  }, []);

  // Subscribe to IPC events
  useEffect(() => {
    // Status changed
    const unsubStatus = ipc.onAIStatusChanged((newStatus) => {
      setStatus(newStatus);
    });

    // Task started
    const unsubStarted = ipc.onAITaskStarted((data) => {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: data.timestamp,
          type: 'system',
          content: `Started task: ${data.taskTitle || data.taskId}`,
        },
      ]);
    });

    // Task completed
    const unsubCompleted = ipc.onAITaskCompleted((data) => {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: data.timestamp,
          type: 'system',
          content: `Completed task: ${data.taskTitle || data.taskId} (${data.duration}ms)`,
        },
      ]);

      // Add to execution logs
      setExecutionLogs((prev) => {
        const newLog: TaskExecutionLog = {
          taskId: data.taskId,
          taskTitle: data.taskTitle,
          startedAt: data.timestamp,
          completedAt: data.timestamp,
          duration: data.duration,
          success: data.success,
          logLines: [],
        };
        return [...prev.slice(-9), newLog];
      });
    });

    // Task failed
    const unsubFailed = ipc.onAITaskFailed((data) => {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: data.timestamp,
          type: 'stderr',
          content: `Failed task: ${data.taskTitle || data.taskId} - ${data.error}`,
        },
      ]);
    });

    // Log line
    const unsubLog = ipc.onAILog((data) => {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: data.line.timestamp,
          type: data.line.type as 'stdout' | 'stderr' | 'system',
          content: data.line.content,
        },
      ]);
    });

    return () => {
      unsubStatus();
      unsubStarted();
      unsubCompleted();
      unsubFailed();
      unsubLog();
    };
  }, []);

  // Actions
  const start = useCallback(async () => {
    try {
      setError(null);
      const newStatus = await ipc.startAIWorker();
      setStatus(newStatus);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to start worker';
      setError(message);
      throw e;
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      setError(null);
      const newStatus = await ipc.stopAIWorker();
      setStatus(newStatus);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to stop worker';
      setError(message);
      throw e;
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      setError(null);
      const newStatus = await ipc.pauseAIWorker();
      setStatus(newStatus);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to pause worker';
      setError(message);
      throw e;
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      setError(null);
      const newStatus = await ipc.resumeAIWorker();
      setStatus(newStatus);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to resume worker';
      setError(message);
      throw e;
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    status,
    config,
    isConnected,
    logs,
    executionLogs,
    start,
    stop,
    pause,
    resume,
    clearLogs,
    error,
  };
}
