/**
 * IPC Client for Renderer Process
 *
 * Main Process와 통신하기 위한 클라이언트
 */

import type {
  Task,
  TaskCreateRequest,
  TaskUpdateRequest,
  FileWatchEvent,
} from '@/types/task';
import type { AppConfig, SourceConfig, UpdateSourceRequest } from '@/types/config';
import type { AIWorkerConfig, AIWorkerStatus, TaskExecutionLog } from '@/types/ai';

// Local type for AI task queue items
interface QueueItem {
  taskId: string;
  taskTitle: string;
  status: 'pending' | 'running';
  addedAt: string;
}

// Get the Electron API from preload
const api = window.api;

// Check if running in Electron
const isElectronEnv = typeof window !== 'undefined' && !!window.api;

// Safe API wrapper that throws if not in Electron
function getApi() {
  if (!api) {
    throw new Error('Not running in Electron environment');
  }
  return api;
}

// ============================================================================
// Tasks
// ============================================================================

export async function getTasks(): Promise<Task[]> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<Task[]>('tasks:getAll');
}

export async function getTaskById(id: string): Promise<Task | null> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<Task | null>('tasks:getById', { id });
}

export async function createTask(data: TaskCreateRequest): Promise<Task> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<Task>('tasks:create', data);
}

export async function updateTask(
  id: string,
  data: TaskUpdateRequest
): Promise<Task> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<Task>('tasks:update', { id, data });
}

export async function deleteTask(id: string): Promise<void> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<void>('tasks:delete', { id });
}

// ============================================================================
// Config
// ============================================================================

export async function getConfig(): Promise<AppConfig> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<AppConfig>('config:get');
}

export async function updateConfig(
  updates: Partial<AppConfig>
): Promise<AppConfig> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<AppConfig>('config:update', updates);
}

// ============================================================================
// Sources
// ============================================================================

export async function getSources(): Promise<SourceConfig[]> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<SourceConfig[]>('sources:getAll');
}

export async function addSource(
  path: string,
  name: string
): Promise<SourceConfig> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<SourceConfig>('sources:add', { path, name });
}

export async function updateSource(
  id: string,
  data: UpdateSourceRequest
): Promise<SourceConfig> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<SourceConfig>('sources:update', { id, data });
}

export async function deleteSource(id: string): Promise<void> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<void>('sources:delete', { id });
}

export async function setActiveSource(id: string): Promise<void> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<void>('sources:setActive', { id });
}

export async function addGitHubSource(data: {
  name: string;
  url?: string;
  owner?: string;
  repo?: string;
  branch: string;
  rootPath: string;
  token: string;
}): Promise<SourceConfig> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<SourceConfig>('github:addSource', data);
}

// ============================================================================
// Dialog
// ============================================================================

export async function selectFolder(): Promise<string | null> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<string | null>('dialog:selectFolder');
}

export async function getAppVersion(): Promise<string> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<string>('app:getVersion');
}

// ============================================================================
// AI Worker
// ============================================================================

export async function startAIWorker(
  config?: Partial<AIWorkerConfig>
): Promise<AIWorkerStatus> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<AIWorkerStatus>('ai:start', config);
}

export async function stopAIWorker(): Promise<AIWorkerStatus> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<AIWorkerStatus>('ai:stop');
}

export async function pauseAIWorker(): Promise<AIWorkerStatus> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<AIWorkerStatus>('ai:pause');
}

export async function resumeAIWorker(): Promise<AIWorkerStatus> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<AIWorkerStatus>('ai:resume');
}

export async function getAIWorkerStatus(): Promise<AIWorkerStatus> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<AIWorkerStatus>('ai:getStatus');
}

export async function getAITaskQueue(): Promise<QueueItem[]> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<QueueItem[]>('ai:getQueue');
}

export async function getAITaskLogs(
  taskId: string
): Promise<TaskExecutionLog | null> {
  if (!api) throw new Error('Not in Electron');
  return api.invoke<TaskExecutionLog | null>('ai:getLogs', { taskId });
}

// ============================================================================
// Event Subscriptions
// ============================================================================

export function onFileChanged(
  callback: (event: FileWatchEvent) => void
): () => void {
  if (!api) return () => {}; // No-op when not in Electron
  return api.on('file:changed', (data: unknown) => {
    callback(data as FileWatchEvent);
  });
}

export function onAIStatusChanged(
  callback: (status: AIWorkerStatus) => void
): () => void {
  if (!api) return () => {};
  return api.on('ai:statusChanged', (data: unknown) => {
    callback(data as AIWorkerStatus);
  });
}

export function onAITaskStarted(
  callback: (data: {
    taskId: string;
    taskTitle: string;
    timestamp: string;
  }) => void
): () => void {
  if (!api) return () => {};
  return api.on('ai:taskStarted', callback as (data: unknown) => void);
}

export function onAITaskCompleted(
  callback: (data: {
    taskId: string;
    taskTitle: string;
    timestamp: string;
    duration: number;
    success: boolean;
  }) => void
): () => void {
  if (!api) return () => {};
  return api.on('ai:taskCompleted', callback as (data: unknown) => void);
}

export function onAITaskFailed(
  callback: (data: {
    taskId: string;
    taskTitle: string;
    timestamp: string;
    error: string;
  }) => void
): () => void {
  if (!api) return () => {};
  return api.on('ai:taskFailed', callback as (data: unknown) => void);
}

export function onAILog(
  callback: (data: {
    taskId: string;
    line: { timestamp: string; type: string; content: string };
  }) => void
): () => void {
  if (!api) return () => {};
  return api.on('ai:log', callback as (data: unknown) => void);
}

// ============================================================================
// Window Controls
// ============================================================================

export async function minimizeWindow(): Promise<void> {
  if (!api) return;
  return api.invoke<void>('window:minimize');
}

export async function toggleMaximize(): Promise<boolean> {
  if (!api) return false;
  return api.invoke<boolean>('window:toggleMaximize');
}

export async function isWindowMaximized(): Promise<boolean> {
  if (!api) return false;
  return api.invoke<boolean>('window:isMaximized');
}

export async function closeWindow(): Promise<void> {
  if (!api) return;
  return api.invoke<void>('window:close');
}

export async function toggleFullScreen(): Promise<boolean> {
  if (!api) return false;
  return api.invoke<boolean>('window:toggleFullScreen');
}

export async function isWindowFullScreen(): Promise<boolean> {
  if (!api) return false;
  return api.invoke<boolean>('window:isFullScreen');
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.api;
}
