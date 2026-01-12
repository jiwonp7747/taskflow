'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { FileWatchEvent } from '@/types/task';

interface UseFileWatcherOptions {
  onFileChange?: (event: FileWatchEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

interface UseFileWatcherReturn {
  isConnected: boolean;
  lastEvent: FileWatchEvent | null;
  reconnect: () => void;
}

export function useFileWatcher(options: UseFileWatcherOptions = {}): UseFileWatcherReturn {
  const {
    onFileChange,
    onConnect,
    onDisconnect,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<FileWatchEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    cleanup();

    try {
      const eventSource = new EventSource('/api/watch');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[FileWatcher] SSE connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'connected') {
            console.log('[FileWatcher] SSE connection confirmed:', data.directory);
            return;
          }

          if (data.type === 'heartbeat') {
            console.log('[FileWatcher] SSE heartbeat:', new Date(data.timestamp).toISOString());
            return;
          }

          // File change event
          if (data.type === 'add' || data.type === 'change' || data.type === 'unlink') {
            const fileEvent = data as FileWatchEvent;
            console.log('[FileWatcher] SSE event received:', {
              type: fileEvent.type,
              taskId: fileEvent.taskId,
              timestamp: new Date(fileEvent.timestamp).toISOString(),
            });
            setLastEvent(fileEvent);
            onFileChange?.(fileEvent);
          }
        } catch (err) {
          console.error('[FileWatcher] Failed to parse SSE message:', err);
        }
      };

      eventSource.onerror = () => {
        console.log('[FileWatcher] SSE disconnected');
        setIsConnected(false);
        onDisconnect?.();
        cleanup();

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current += 1;

          console.log(`[FileWatcher] SSE reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}, delay: ${delay}ms)`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('[FileWatcher] SSE max reconnection attempts reached');
        }
      };
    } catch (err) {
      console.error('[FileWatcher] Failed to create EventSource:', err);
      setIsConnected(false);
    }
  }, [cleanup, onConnect, onDisconnect, onFileChange, reconnectDelay, maxReconnectAttempts]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Setup connection on mount
  useEffect(() => {
    connect();

    return () => {
      cleanup();
    };
  }, [connect, cleanup]);

  return {
    isConnected,
    lastEvent,
    reconnect,
  };
}
