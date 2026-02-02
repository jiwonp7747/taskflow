'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, TaskStatus, TaskPriority, TaskUpdateRequest } from '@/types/task';
import type { ConversationMessage } from '@/lib/sessionManager';
import { COLUMNS, PRIORITY_CONFIG } from '@/types/task';
import { DatePicker } from '@/components/ui/DatePicker';

type TabType = 'settings' | 'chat';

interface TaskSidebarProps {
  task: Task | null;
  onClose: () => void;
  onSave: (id: string, data: TaskUpdateRequest) => Promise<Task | null>;
  onDelete: (id: string) => Promise<boolean>;
  // Conversation props
  conversationMessages?: ConversationMessage[];
  isSessionActive?: boolean;
  onStartSession?: (taskId: string) => Promise<void>;
  onSendMessage?: (taskId: string, message: string) => void;
  onStopSession?: (taskId: string) => void;
}

export function TaskSidebar({
  task,
  onClose,
  onSave,
  onDelete,
  conversationMessages = [],
  isSessionActive = false,
  onStartSession,
  onSendMessage,
  onStopSession,
}: TaskSidebarProps) {
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [chatInput, setChatInput] = useState('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form and tab when task changes
  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        tags: task.tags,
        start_date: task.start_date,
        due_date: task.due_date,
        content: task.content,
      });
      setHasChanges(false);
      setActiveTab('settings'); // Always start with settings tab
      setChatInput('');
    }
  }, [task]);

  // Auto-scroll chat messages
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages, activeTab]);

  // Focus textarea when switching to chat tab with active session
  useEffect(() => {
    if (activeTab === 'chat' && isSessionActive) {
      textareaRef.current?.focus();
    }
  }, [activeTab, isSessionActive]);

  // Handle field changes
  const handleChange = useCallback((field: keyof Task, value: unknown) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!task || !hasChanges) return;

    setIsSaving(true);
    try {
      await onSave(task.id, editedTask);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [task, editedTask, hasChanges, onSave]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!task) return;

    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await onDelete(task.id);
      if (success) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [task, onDelete, onClose]);

  // Handle start chat session
  const handleStartSession = useCallback(async () => {
    if (!task || !onStartSession) return;
    setIsStartingSession(true);
    try {
      await onStartSession(task.id);
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setIsStartingSession(false);
    }
  }, [task, onStartSession]);

  // Handle send chat message
  const handleSendMessage = useCallback(() => {
    if (!task || !chatInput.trim() || !isSessionActive || !onSendMessage) return;
    onSendMessage(task.id, chatInput.trim());
    setChatInput('');
    textareaRef.current?.focus();
  }, [task, chatInput, isSessionActive, onSendMessage]);

  // Handle chat key press
  const handleChatKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handle stop chat session
  const handleStopSession = useCallback(() => {
    if (!task || !onStopSession) return;
    onStopSession(task.id);
  }, [task, onStopSession]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSave]);

  if (!task) return null;

  const column = COLUMNS.find((c) => c.id === task.status);
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl z-50 flex flex-col bg-slate-950 border-l border-white/5 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="border-b border-white/5 bg-gradient-to-r from-slate-900/80 to-slate-950">
          {/* Top row with status and close button */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${column?.color.replace('text-', 'bg-')} animate-pulse`} />
              <span className={`text-xs font-mono uppercase tracking-wider ${column?.color}`}>
                {column?.title}
              </span>
              {/* Session status for chat */}
              {activeTab === 'chat' && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  isSessionActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                }`}>
                  {isSessionActive ? '● 세션 활성' : '○ 세션 종료'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Unsaved indicator */}
              {hasChanges && activeTab === 'settings' && (
                <span className="px-2 py-0.5 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full uppercase tracking-wider">
                  Unsaved
                </span>
              )}

              {/* Stop session button (only in chat tab when session is active) */}
              {activeTab === 'chat' && isSessionActive && (
                <button
                  onClick={handleStopSession}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  세션 종료
                </button>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex px-6 gap-1">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-slate-950 text-white border-t border-x border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                설정
              </span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-slate-950 text-white border-t border-x border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                채팅
                {conversationMessages.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-400 rounded-full">
                    {conversationMessages.length}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Content - Settings Tab */}
        {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={editedTask.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/5 rounded-lg text-lg font-medium text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              placeholder="Task title..."
            />
          </div>

          {/* Status & Priority row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                value={editedTask.status || task.status}
                onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.icon} {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                Priority
              </label>
              <select
                value={editedTask.priority || task.priority}
                onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Assignee
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange('assignee', 'user')}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-mono transition-all ${
                  editedTask.assignee === 'user'
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                    : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                👤 User
              </button>
              <button
                type="button"
                onClick={() => handleChange('assignee', 'ai-agent')}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-mono transition-all ${
                  editedTask.assignee === 'ai-agent'
                    ? 'bg-violet-500/10 border-violet-500/50 text-violet-400'
                    : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                🤖 AI Agent
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={(editedTask.tags || []).join(', ')}
              onChange={(e) => handleChange('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
              placeholder="backend, api, auth..."
            />
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={editedTask.start_date}
              onChange={(date) => handleChange('start_date', date)}
              maxDate={editedTask.due_date}
            />
            <DatePicker
              label="Due Date"
              value={editedTask.due_date}
              onChange={(date) => handleChange('due_date', date)}
              minDate={editedTask.start_date}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Content
            </label>
            <textarea
              value={editedTask.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={8}
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
              placeholder="Task content..."
            />
          </div>

          {/* File path */}
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="truncate">{task.filePath}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-slate-600">
              <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(task.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        )}

        {/* Content - Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversationMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-950/50 to-slate-900 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <span className="text-3xl">💬</span>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">대화 시작하기</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">
                  Claude와 대화형으로 태스크를 수행합니다.
                  세션을 시작하면 이전 대화를 이어서 진행할 수 있습니다.
                </p>
                <button
                  onClick={handleStartSession}
                  disabled={isStartingSession}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
                >
                  {isStartingSession ? (
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
                {conversationMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        )}

        {/* Footer - Settings Tab */}
        {activeTab === 'settings' && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-900/50">
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-all disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Task'}
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={`
              px-6 py-2 rounded-lg text-sm font-mono font-medium
              transition-all
              ${hasChanges
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
              disabled:opacity-50
            `}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
        )}

        {/* Footer - Chat Tab */}
        {activeTab === 'chat' && (isSessionActive || conversationMessages.length > 0) && (
          <div className="border-t border-white/10 p-4 bg-slate-900/50">
            {!isSessionActive && conversationMessages.length > 0 ? (
              <button
                onClick={handleStartSession}
                disabled={isStartingSession}
                className="w-full py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 font-medium rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all disabled:opacity-50"
              >
                {isStartingSession ? '세션 재시작 중...' : '세션 재시작 (이전 대화 이어가기)'}
              </button>
            ) : isSessionActive ? (
              <div className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
                  className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent"
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

// Message bubble component for chat
function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 bg-slate-800/50 text-slate-500 text-xs rounded-full">
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
            : 'bg-slate-800/50 border border-white/10 text-slate-200'
        }`}
      >
        {/* Content */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content || (
            <span className="text-slate-500 italic">
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
        <div className={`mt-2 text-[10px] ${isUser ? 'text-white/60' : 'text-slate-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
