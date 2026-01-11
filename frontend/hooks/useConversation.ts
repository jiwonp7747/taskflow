'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConversationMessage } from '@/lib/sessionManager';

interface SessionState {
  taskId: string;
  sessionId: string | null;
  messages: ConversationMessage[];
  isActive: boolean;
  startedAt: string;
  lastActivityAt: string;
}

interface UseConversationReturn {
  messages: ConversationMessage[];
  isSessionActive: boolean;
  isConnected: boolean;
  startSession: (taskId: string) => Promise<void>;
  sendMessage: (taskId: string, message: string) => void;
  stopSession: (taskId: string) => void;
  clearSession: (taskId: string) => void;
  loadSession: (taskId: string) => Promise<void>;
}

export function useConversation(currentTaskId: string | null): UseConversationReturn {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE for the current task
  useEffect(() => {
    if (!currentTaskId) {
      setMessages([]);
      setIsSessionActive(false);
      return;
    }

    // Close previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Connect to SSE
    const eventSource = new EventSource(`/api/ai/session?stream=true&taskId=${currentTaskId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'session-started':
            setIsSessionActive(true);
            break;

          case 'session-ended':
            setIsSessionActive(false);
            break;

          case 'message':
            setMessages(prev => {
              // Check if message already exists
              const exists = prev.some(m => m.id === data.message.id);
              if (exists) {
                return prev.map(m => m.id === data.message.id ? data.message : m);
              }
              return [...prev, data.message];
            });
            break;

          case 'stream':
            // Update message content during streaming
            setMessages(prev =>
              prev.map(m =>
                m.id === data.messageId
                  ? { ...m, content: m.content + data.content, isStreaming: true }
                  : m
              )
            );
            break;

          case 'stream-end':
            // Mark message as done streaming
            setMessages(prev =>
              prev.map(m =>
                m.id === data.messageId
                  ? { ...m, isStreaming: false }
                  : m
              )
            );
            break;

          case 'error':
            console.error('[Conversation] Session error:', data.error);
            break;
        }
      } catch (error) {
        console.error('[Conversation] Failed to parse event:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // Try to reconnect after a delay
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          eventSource.close();
          // Will reconnect on next effect run
        }
      }, 5000);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [currentTaskId]);

  // Load session info
  const loadSession = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/ai/session?taskId=${taskId}`);
      const data = await response.json();

      if (data.session) {
        setMessages(data.session.messages || []);
        setIsSessionActive(data.session.isActive || false);
      } else {
        setMessages([]);
        setIsSessionActive(false);
      }
    } catch (error) {
      console.error('[Conversation] Failed to load session:', error);
    }
  }, []);

  // Start session
  const startSession = useCallback(async (taskId: string) => {
    try {
      const response = await fetch('/api/ai/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', taskId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start session');
      }
    } catch (error) {
      console.error('[Conversation] Failed to start session:', error);
      throw error;
    }
  }, []);

  // Send message
  const sendMessage = useCallback((taskId: string, message: string) => {
    fetch('/api/ai/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'message', taskId, message }),
    }).catch(error => {
      console.error('[Conversation] Failed to send message:', error);
    });
  }, []);

  // Stop session
  const stopSession = useCallback((taskId: string) => {
    fetch('/api/ai/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', taskId }),
    }).catch(error => {
      console.error('[Conversation] Failed to stop session:', error);
    });
  }, []);

  // Clear session
  const clearSession = useCallback((taskId: string) => {
    fetch('/api/ai/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear', taskId }),
    }).then(() => {
      setMessages([]);
      setIsSessionActive(false);
    }).catch(error => {
      console.error('[Conversation] Failed to clear session:', error);
    });
  }, []);

  return {
    messages,
    isSessionActive,
    isConnected,
    startSession,
    sendMessage,
    stopSession,
    clearSession,
    loadSession,
  };
}
