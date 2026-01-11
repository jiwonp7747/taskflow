'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AIWorkerStatus,
  AIWorkerConfig,
  LogLine,
  TaskExecutionLog,
  WSMessage,
} from '@/types/ai';
import { INITIAL_AI_WORKER_STATUS, DEFAULT_AI_WORKER_CONFIG } from '@/types/ai';

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
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [executionLogs, setExecutionLogs] = useState<TaskExecutionLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/ai/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'connected':
        if (message.payload.status) {
          setStatus(message.payload.status);
        }
        // Config is sent directly in payload
        if (message.payload.config) {
          setConfig(message.payload.config);
        }
        break;

      case 'heartbeat':
        if (message.payload.status) {
          setStatus(message.payload.status);
        }
        break;

      case 'worker:started':
      case 'worker:stopped':
      case 'worker:paused':
      case 'worker:resumed':
        if (message.payload.status) {
          setStatus(message.payload.status);
        }
        break;

      case 'task:started':
        if (message.payload.status) {
          setStatus(message.payload.status);
        }
        // Add system log
        setLogs(prev => [...prev, {
          timestamp: message.payload.timestamp,
          type: 'system',
          content: `Started task: ${message.payload.taskTitle || message.payload.taskId}`,
        }]);
        break;

      case 'task:log':
        if (message.payload.logLine) {
          setLogs(prev => [...prev, message.payload.logLine!]);
        }
        break;

      case 'task:completed':
        if (message.payload.status) {
          setStatus(message.payload.status);
        }
        // Add completion log
        setLogs(prev => [...prev, {
          timestamp: message.payload.timestamp,
          type: 'system',
          content: `Completed task: ${message.payload.taskTitle || message.payload.taskId}`,
        }]);
        // Add to execution logs
        if (message.payload.result) {
          setExecutionLogs(prev => {
            const newLog: TaskExecutionLog = {
              taskId: message.payload.taskId!,
              taskTitle: message.payload.taskTitle || message.payload.taskId!,
              startedAt: message.payload.result!.startedAt,
              completedAt: message.payload.result!.completedAt,
              duration: message.payload.result!.duration,
              success: message.payload.result!.success,
              exitCode: message.payload.result!.exitCode,
              logLines: [], // Would need to be populated from the log buffer
            };
            return [...prev.slice(-9), newLog]; // Keep last 10 logs
          });
        }
        break;

      case 'task:failed':
        if (message.payload.status) {
          setStatus(message.payload.status);
        }
        // Add failure log
        setLogs(prev => [...prev, {
          timestamp: message.payload.timestamp,
          type: 'stderr',
          content: `Failed task: ${message.payload.taskTitle || message.payload.taskId} - ${message.payload.message}`,
        }]);
        break;

      case 'task:queued':
        setLogs(prev => [...prev, {
          timestamp: message.payload.timestamp,
          type: 'system',
          content: `Queued task: ${message.payload.taskTitle || message.payload.taskId}`,
        }]);
        break;

      case 'error':
        setError(message.payload.message || 'Unknown error');
        setLogs(prev => [...prev, {
          timestamp: message.payload.timestamp,
          type: 'stderr',
          content: `Error: ${message.payload.message}`,
        }]);
        break;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/ai/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
          setConfig(data.config);
        }
      } catch (e) {
        console.error('Failed to fetch AI worker status:', e);
      }
    };

    fetchStatus();
  }, []);

  // Actions
  const start = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/start', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start worker');
      }
      const data = await response.json();
      setStatus(data.status);
      setConfig(data.config);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to start worker';
      setError(message);
      throw e;
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/stop', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to stop worker');
      }
      const data = await response.json();
      setStatus(data.status);
      setConfig(data.config);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to stop worker';
      setError(message);
      throw e;
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/pause', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to pause worker');
      }
      const data = await response.json();
      setStatus(data.status);
      setConfig(data.config);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to pause worker';
      setError(message);
      throw e;
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/resume', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resume worker');
      }
      const data = await response.json();
      setStatus(data.status);
      setConfig(data.config);
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
