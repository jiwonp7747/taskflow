/**
 * AI Worker Service for Electron Main Process
 *
 * AI 에이전트 태스크 자동 실행 관리
 */

import { BrowserWindow } from 'electron';
import type {
  AIWorkerConfig,
  AIWorkerStatus,
  LogLine,
  TaskExecutionLog,
} from '../../types/ai';
import { INITIAL_AI_WORKER_STATUS, DEFAULT_AI_WORKER_CONFIG } from '../../types/ai';
import type { Task } from '../../types/task';
import { getDatabase } from './database.service';
import { getAllTasks, updateTask } from '../lib/fileSystem';
import {
  executeClaudeCode,
  checkClaudeAvailable,
  killActiveExecution,
  isExecuting,
} from './claudeExecutor.service';
import { safeLog, safeError } from '../lib/safeConsole';

// Worker state
let workerStatus: AIWorkerStatus = { ...INITIAL_AI_WORKER_STATUS };
let workerConfig: AIWorkerConfig = { ...DEFAULT_AI_WORKER_CONFIG };
let pollingInterval: NodeJS.Timeout | null = null;
let taskQueue: Array<{ task: Task; queuedAt: string }> = [];
let executionLogs: Map<string, TaskExecutionLog> = new Map();

/**
 * Send event to all renderer windows
 */
function sendToAllWindows(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((window) => {
    try {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    } catch {
      // Window or webContents may have been destroyed between check and send
    }
  });
}

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
 * Load AI worker config from database
 */
function loadAIWorkerConfig(): AIWorkerConfig {
  const db = getDatabase();

  const row = db
    .prepare(
      'SELECT enabled, auto_start, polling_interval, max_concurrent, timeout, working_directory FROM ai_worker_config WHERE id = 1'
    )
    .get() as {
    enabled: number;
    auto_start: number;
    polling_interval: number;
    max_concurrent: number;
    timeout: number;
    working_directory: string | null;
  };

  return {
    enabled: row.enabled === 1,
    autoStart: row.auto_start === 1,
    pollingInterval: row.polling_interval,
    maxConcurrent: row.max_concurrent,
    timeout: row.timeout,
    workingDirectory: row.working_directory || undefined,
  };
}

/**
 * Check if a task is eligible for AI execution
 */
function isEligibleForAI(task: Task): boolean {
  return (
    task.assignee === 'ai-agent' &&
    (task.status === 'TODO' || task.status === 'NEED_FIX')
  );
}

/**
 * Find eligible tasks
 */
async function findEligibleTasks(): Promise<Task[]> {
  const tasksDir = getActiveSourceDir();
  if (!tasksDir) {
    return [];
  }

  const allTasks = await getAllTasks(tasksDir);
  safeLog('[AIWorker] Finding eligible tasks...');

  const eligible = allTasks.filter(isEligibleForAI);
  safeLog(
    '[AIWorker] Eligible tasks:',
    eligible.map((t) => ({ id: t.id, title: t.title }))
  );

  return eligible;
}

/**
 * Add task to queue
 */
function addToQueue(task: Task): void {
  if (taskQueue.some((item) => item.task.id === task.id)) {
    return;
  }

  taskQueue.push({
    task,
    queuedAt: new Date().toISOString(),
  });

  workerStatus.queueLength = taskQueue.length;

  sendToAllWindows('ai:statusChanged', workerStatus);
}

/**
 * Execute a single task
 */
async function executeTask(task: Task): Promise<void> {
  safeLog('[AIWorker] Executing task:', {
    id: task.id,
    title: task.title,
    status: task.status,
  });

  const tasksDir = getActiveSourceDir();
  if (!tasksDir) {
    throw new Error('No active source directory');
  }

  // Update status to IN_PROGRESS
  workerStatus.currentTask = task.id;
  workerStatus.currentTaskTitle = task.title;

  sendToAllWindows('ai:taskStarted', {
    taskId: task.id,
    taskTitle: task.title,
    timestamp: new Date().toISOString(),
  });

  sendToAllWindows('ai:statusChanged', workerStatus);

  try {
    // Update task status in file
    await updateTask(task.id, { status: 'IN_PROGRESS' }, tasksDir);

    // Initialize execution log
    const log: TaskExecutionLog = {
      taskId: task.id,
      taskTitle: task.title,
      startedAt: new Date().toISOString(),
      logLines: [],
    };
    executionLogs.set(task.id, log);

    // Execute Claude Code
    const result = await executeClaudeCode(
      {
        taskId: task.id,
        taskTitle: task.title,
        taskContent: task.rawContent,
        workingDirectory: workerConfig.workingDirectory || process.cwd(),
        timeout: workerConfig.timeout,
      },
      {
        onLog: (line: LogLine) => {
          log.logLines.push(line);
        },
      }
    );

    // Update log with result
    log.completedAt = result.completedAt;
    log.duration = result.duration;
    log.success = result.success;
    log.exitCode = result.exitCode;
    log.error = result.error;

    // Update task status based on result
    if (result.success) {
      const workLogEntry = `\n\n### AI Work Log - ${new Date().toISOString()}\n\n작업이 완료되었습니다. (${result.duration}ms)\n\n실행 결과:\n\`\`\`\n${result.stdout.slice(0, 2000)}${result.stdout.length > 2000 ? '\n...(truncated)' : ''}\n\`\`\`\n`;

      const currentTask = await getAllTasks(tasksDir).then((tasks) =>
        tasks.find((t) => t.id === task.id)
      );

      if (currentTask) {
        await updateTask(
          task.id,
          {
            status: 'IN_REVIEW',
            content: (currentTask.content || '') + workLogEntry,
          },
          tasksDir
        );
      }

      sendToAllWindows('ai:taskCompleted', {
        taskId: task.id,
        taskTitle: task.title,
        timestamp: new Date().toISOString(),
        duration: result.duration,
        success: true,
      });
    } else {
      const workLogEntry = `\n\n### AI Work Log - ${new Date().toISOString()}\n\n작업 실패 (종료 코드: ${result.exitCode}, ${result.duration}ms)\n\n에러:\n\`\`\`\n${result.error || result.stderr}\n\`\`\`\n`;

      const currentTask = await getAllTasks(tasksDir).then((tasks) =>
        tasks.find((t) => t.id === task.id)
      );

      if (currentTask) {
        await updateTask(
          task.id,
          {
            status: 'NEED_FIX',
            content: (currentTask.content || '') + workLogEntry,
          },
          tasksDir
        );
      }

      sendToAllWindows('ai:taskFailed', {
        taskId: task.id,
        taskTitle: task.title,
        timestamp: new Date().toISOString(),
        error: result.error || result.stderr,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    sendToAllWindows('ai:taskFailed', {
      taskId: task.id,
      taskTitle: task.title,
      timestamp: new Date().toISOString(),
      error: errorMessage,
    });

    safeError(`Error executing task ${task.id}:`, error);
  } finally {
    workerStatus.currentTask = null;
    workerStatus.currentTaskTitle = undefined;
    workerStatus.lastExecution = new Date().toISOString();
    sendToAllWindows('ai:statusChanged', workerStatus);
  }
}

/**
 * Process the task queue
 */
async function processQueue(): Promise<void> {
  if (taskQueue.length === 0 || isExecuting() || workerStatus.isPaused) {
    return;
  }

  const item = taskQueue.shift();
  if (!item) return;

  workerStatus.queueLength = taskQueue.length;
  await executeTask(item.task);
}

/**
 * Poll for new tasks
 */
async function pollForTasks(): Promise<void> {
  if (workerStatus.isPaused || isExecuting()) {
    return;
  }

  workerStatus.lastCheck = new Date().toISOString();

  try {
    const eligibleTasks = await findEligibleTasks();

    for (const task of eligibleTasks) {
      addToQueue(task);
    }

    await processQueue();
  } catch (error) {
    safeError('[AIWorker] Error polling for tasks:', error);
  }
}

/**
 * Get current worker status
 */
export function getWorkerStatus(): AIWorkerStatus {
  return { ...workerStatus };
}

/**
 * Get current worker config
 */
export function getWorkerConfig(): AIWorkerConfig {
  return { ...workerConfig };
}

/**
 * Get execution log for a task
 */
export function getExecutionLog(taskId: string): TaskExecutionLog | null {
  return executionLogs.get(taskId) || null;
}

/**
 * Get task queue
 */
export function getTaskQueue(): Array<{
  taskId: string;
  taskTitle: string;
  queuedAt: string;
}> {
  return taskQueue.map((item) => ({
    taskId: item.task.id,
    taskTitle: item.task.title,
    queuedAt: item.queuedAt,
  }));
}

/**
 * Start the worker
 */
export async function startWorker(
  config?: Partial<AIWorkerConfig>
): Promise<AIWorkerStatus> {
  if (workerStatus.isRunning) {
    return workerStatus;
  }

  // Check if Claude is available
  const isAvailable = await checkClaudeAvailable();
  if (!isAvailable) {
    throw new Error('Claude Code CLI is not available. Please install it first.');
  }

  // Load config from database and merge with provided config
  const savedConfig = loadAIWorkerConfig();
  workerConfig = {
    ...savedConfig,
    ...config,
  };

  if (!workerConfig.enabled) {
    throw new Error('AI Worker is disabled in configuration');
  }

  // Update status
  workerStatus.isRunning = true;
  workerStatus.isPaused = false;
  workerStatus.startedAt = new Date().toISOString();

  // Start polling
  pollingInterval = setInterval(pollForTasks, workerConfig.pollingInterval);

  // Do an immediate poll
  pollForTasks();

  sendToAllWindows('ai:statusChanged', workerStatus);
  safeLog('[AIWorker] Worker started');

  return workerStatus;
}

/**
 * Stop the worker
 */
export function stopWorker(): AIWorkerStatus {
  if (!workerStatus.isRunning) {
    return workerStatus;
  }

  // Clear polling interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  // Kill any active execution
  if (isExecuting()) {
    killActiveExecution();
  }

  // Clear queue
  taskQueue = [];

  // Update status
  workerStatus = {
    ...INITIAL_AI_WORKER_STATUS,
  };

  sendToAllWindows('ai:statusChanged', workerStatus);
  safeLog('[AIWorker] Worker stopped');

  return workerStatus;
}

/**
 * Pause the worker
 */
export function pauseWorker(): AIWorkerStatus {
  if (!workerStatus.isRunning || workerStatus.isPaused) {
    return workerStatus;
  }

  workerStatus.isPaused = true;
  sendToAllWindows('ai:statusChanged', workerStatus);
  safeLog('[AIWorker] Worker paused');

  return workerStatus;
}

/**
 * Resume the worker
 */
export function resumeWorker(): AIWorkerStatus {
  if (!workerStatus.isRunning || !workerStatus.isPaused) {
    return workerStatus;
  }

  workerStatus.isPaused = false;
  pollForTasks();

  sendToAllWindows('ai:statusChanged', workerStatus);
  safeLog('[AIWorker] Worker resumed');

  return workerStatus;
}

/**
 * Cleanup worker (for app quit)
 */
export function cleanupWorker(): void {
  if (workerStatus.isRunning) {
    stopWorker();
  }
  executionLogs.clear();
}
