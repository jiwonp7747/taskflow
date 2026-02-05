'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Task } from '@/types/task';
import type { ConversationMessage } from '@/lib/sessionManager';

interface ConversationPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  messages: ConversationMessage[];
  isSessionActive: boolean;
  onStartSession: (taskId: string) => Promise<void>;
  onSendMessage: (taskId: string, message: string) => void;
  onStopSession: (taskId: string) => void;
}

export function ConversationPanel({
  task,
  isOpen,
  onClose,
  messages,
  isSessionActive,
  onStartSession,
  onSendMessage,
  onStopSession,
}: ConversationPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && isSessionActive) {
      textareaRef.current?.focus();
    }
  }, [isOpen, isSessionActive]);

  // Handle start session
  const handleStartSession = useCallback(async () => {
    if (!task) return;
    setIsStarting(true);
    try {
      await onStartSession(task.id);
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setIsStarting(false);
    }
  }, [task, onStartSession]);

  // Handle send message
  const handleSendMessage = useCallback(() => {
    if (!task || !inputValue.trim() || !isSessionActive) return;
    onSendMessage(task.id, inputValue.trim());
    setInputValue('');
    textareaRef.current?.focus();
  }, [task, inputValue, isSessionActive, onSendMessage]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handle stop session
  const handleStopSession = useCallback(() => {
    if (!task) return;
    onStopSession(task.id);
  }, [task, onStopSession]);

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[600px] bg-[var(--glass-bg)] border-l border-[var(--glass-border)] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)] bg-[var(--card-bg)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div>
              <h2 className="text-[var(--foreground)] font-medium truncate max-w-[400px]">
                {task.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <span className={`px-1.5 py-0.5 rounded ${
                  isSessionActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--glass-bg)] text-[var(--text-tertiary)]'
                }`}>
                  {isSessionActive ? '● 세션 활성' : '○ 세션 종료'}
                </span>
                <span>{messages.length} 메시지</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSessionActive && (
              <button
                onClick={handleStopSession}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                세션 종료
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-tertiary)] hover:text-[var(--foreground)] hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-950/50 to-[var(--glass-bg)] border border-cyan-500/20 flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">대화 시작하기</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
                Claude와 대화형으로 태스크를 수행합니다.
                세션을 시작하면 이전 대화를 이어서 진행할 수 있습니다.
              </p>
              <button
                onClick={handleStartSession}
                disabled={isStarting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
              >
                {isStarting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>시작 중...</span>
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    <span>세션 시작</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        {(isSessionActive || messages.length > 0) && (
          <div className="border-t border-[var(--glass-border)] p-4 bg-[var(--card-bg)]">
            {!isSessionActive && messages.length > 0 ? (
              <button
                onClick={handleStartSession}
                disabled={isStarting}
                className="w-full py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 font-medium rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all disabled:opacity-50"
              >
                {isStarting ? '세션 재시작 중...' : '세션 재시작 (이전 대화 이어가기)'}
              </button>
            ) : (
              <div className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
                  className="flex-1 px-4 py-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent"
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 bg-[var(--glass-bg)] text-[var(--text-secondary)] text-xs rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
            : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--foreground)]'
        }`}
      >
        {/* Content */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content || (
            <span className="text-[var(--text-secondary)] italic">
              {message.isStreaming ? (
                <span className="flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  Claude가 응답 중...
                </span>
              ) : (
                '(빈 메시지)'
              )}
            </span>
          )}
        </div>

        {/* Streaming indicator */}
        {message.isStreaming && message.content && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400">
            <span className="animate-pulse">●</span>
            <span>입력 중...</span>
          </div>
        )}

        {/* Timestamp */}
        <div className={`mt-2 text-[10px] ${isUser ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
          {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
