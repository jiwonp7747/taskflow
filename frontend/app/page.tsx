'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Task, FileWatchEvent } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useFileWatcher } from '@/hooks/useFileWatcher';
import { TaskBoard } from '@/components/kanban/TaskBoard';
import { TaskSidebar } from '@/components/kanban/TaskSidebar';
import { CreateTaskModal } from '@/components/kanban/CreateTaskModal';

export default function Home() {
  const {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [workingTaskIds, setWorkingTaskIds] = useState<string[]>([]);

  // File watcher for real-time updates
  const { isConnected, lastEvent, reconnect } = useFileWatcher({
    onFileChange: useCallback((event: FileWatchEvent) => {
      console.log('File change detected:', event);
      // Refresh tasks on file change
      fetchTasks();
    }, [fetchTasks]),
  });

  // Simulate AI working status for demo (in real app, this would be from the API)
  useEffect(() => {
    const aiTasks = tasks.filter(
      (t) => t.assignee === 'ai-agent' && t.status === 'IN_PROGRESS'
    );
    setWorkingTaskIds(aiTasks.map((t) => t.id));
  }, [tasks]);

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // Handle sidebar close
  const handleCloseSidebar = useCallback(() => {
    setSelectedTask(null);
  }, []);

  // Handle task update
  const handleTaskUpdate = useCallback(async (id: string, data: Partial<Task>) => {
    const result = await updateTask(id, data);
    if (result && selectedTask?.id === id) {
      setSelectedTask(result);
    }
    return result;
  }, [updateTask, selectedTask]);

  // Handle task delete
  const handleTaskDelete = useCallback(async (id: string) => {
    const result = await deleteTask(id);
    if (result && selectedTask?.id === id) {
      setSelectedTask(null);
    }
    return result;
  }, [deleteTask, selectedTask]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N to create new task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsCreateModalOpen(true);
      }
      // Cmd/Ctrl + R to refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && !e.shiftKey) {
        e.preventDefault();
        fetchTasks();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchTasks]);

  return (
    <div className="min-h-screen bg-[#050508]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {/* Logo */}
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <span className="text-white font-bold text-lg">T</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/20 to-transparent" />
                </div>

                {/* Title */}
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    TaskFlow
                  </h1>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    AI Task Management System
                  </p>
                </div>
              </div>

              {/* Connection status */}
              <div className="flex items-center gap-2 ml-6">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {isConnected ? 'Live Sync' : 'Disconnected'}
                </span>
                {!isConnected && (
                  <button
                    onClick={reconnect}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Task count */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-white/5 rounded-lg">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Tasks</span>
                <span className="text-sm font-mono font-bold text-cyan-400">{tasks.length}</span>
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchTasks}
                disabled={loading}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5 rounded-lg transition-all disabled:opacity-50"
                title="Refresh (Cmd+R)"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Create task button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Task</span>
                <kbd className="hidden sm:inline-flex ml-1">⌘N</kbd>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Error state */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm text-red-400">{error}</span>
            <button
              onClick={fetchTasks}
              className="ml-auto text-xs font-mono text-red-400 hover:text-red-300 underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-sm font-mono text-slate-500 uppercase tracking-wider">
              Loading tasks...
            </p>
          </div>
        )}

        {/* Kanban board */}
        {!loading || tasks.length > 0 ? (
          <TaskBoard
            tasks={tasks}
            onTaskUpdate={handleTaskUpdate}
            onTaskClick={handleTaskClick}
            workingTaskIds={workingTaskIds}
          />
        ) : null}

        {/* Empty state */}
        {!loading && tasks.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-950/50 to-slate-900 border border-cyan-500/20 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-cyan-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-white mb-2">No tasks yet</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              Create your first task or add markdown files to the tasks folder to get started.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create First Task</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-600">
            <div className="flex items-center gap-4">
              <span>TaskFlow v1.0</span>
              <span className="text-slate-700">|</span>
              <span>File-based AI Task Management</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd>⌘N</kbd> New Task
              </span>
              <span className="flex items-center gap-1">
                <kbd>⌘S</kbd> Save
              </span>
              <span className="flex items-center gap-1">
                <kbd>Esc</kbd> Close
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Task sidebar */}
      <TaskSidebar
        task={selectedTask}
        onClose={handleCloseSidebar}
        onSave={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />

      {/* Create task modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createTask}
      />

      {/* Last event indicator (for debugging) */}
      {lastEvent && (
        <div className="fixed bottom-16 right-6 px-3 py-2 bg-slate-900/90 border border-white/5 rounded-lg text-[10px] font-mono text-slate-500 z-50 animate-pulse">
          <span className="text-cyan-400">{lastEvent.type}</span>: {lastEvent.taskId}
        </div>
      )}
    </div>
  );
}
