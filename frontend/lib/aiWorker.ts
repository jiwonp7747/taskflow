import type { AIWorkerConfig, AIWorkerStatus, LogLine, TaskExecutionLog, WSMessage } from '@/types/ai';
import { INITIAL_AI_WORKER_STATUS, DEFAULT_AI_WORKER_CONFIG } from '@/types/ai';
import type { Task } from '@/types/task';
import { getAllTasks, updateTask, getTasksDirectoryAsync } from './fileSystem';
import { getAIWorkerConfig } from './config';
import { executeClaudeCode, checkClaudeAvailable, killActiveExecution, isExecuting } from './claudeExecutor';

// Worker state
let workerStatus: AIWorkerStatus = { ...INITIAL_AI_WORKER_STATUS };
let workerConfig: AIWorkerConfig = { ...DEFAULT_AI_WORKER_CONFIG };
let pollingInterval: NodeJS.Timeout | null = null;
let taskQueue: Array<{ task: Task; queuedAt: string }> = [];
let executionLogs: Map<string, TaskExecutionLog> = new Map();

// Event subscribers (for WebSocket broadcasting)
type WSSubscriber = (message: WSMessage) => void;
const subscribers: Set<WSSubscriber> = new Set();

// Broadcast message to all subscribers
function broadcast(message: WSMessage) {
  subscribers.forEach(subscriber => {
    try {
      subscriber(message);
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  });
}

// Subscribe to worker events
export function subscribe(callback: WSSubscriber): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

// Get current worker status
export function getWorkerStatus(): AIWorkerStatus {
  return { ...workerStatus };
}

// Get current worker config
export function getWorkerConfig(): AIWorkerConfig {
  return { ...workerConfig };
}

// Get execution log for a task
export function getExecutionLog(taskId: string): TaskExecutionLog | null {
  return executionLogs.get(taskId) || null;
}

// Get all execution logs
export function getAllExecutionLogs(): TaskExecutionLog[] {
  return Array.from(executionLogs.values());
}

// Get task queue
export function getTaskQueue(): Array<{ taskId: string; taskTitle: string; queuedAt: string }> {
  return taskQueue.map(item => ({
    taskId: item.task.id,
    taskTitle: item.task.title,
    queuedAt: item.queuedAt,
  }));
}

// Check if a task is eligible for AI execution
function isEligibleForAI(task: Task): boolean {
  return (
    task.assignee === 'ai-agent' &&
    (task.status === 'TODO' || task.status === 'NEED_FIX')
  );
}

// Find eligible tasks
async function findEligibleTasks(): Promise<Task[]> {
  const tasksDir = await getTasksDirectoryAsync();
  const allTasks = await getAllTasks(tasksDir);

  // Debug logging
  console.log('[AI Worker] Finding eligible tasks...');
  console.log('[AI Worker] All tasks:', allTasks.map(t => ({ id: t.id, status: t.status, assignee: t.assignee })));

  const eligible = allTasks.filter(isEligibleForAI);
  console.log('[AI Worker] Eligible tasks:', eligible.map(t => ({ id: t.id, title: t.title })));

  return eligible;
}

// Add task to queue
function addToQueue(task: Task) {
  // Check if already in queue
  if (taskQueue.some(item => item.task.id === task.id)) {
    return;
  }

  taskQueue.push({
    task,
    queuedAt: new Date().toISOString(),
  });

  workerStatus.queueLength = taskQueue.length;

  broadcast({
    type: 'task:queued',
    payload: {
      taskId: task.id,
      taskTitle: task.title,
      timestamp: new Date().toISOString(),
    },
  });
}

// Execute a single task
async function executeTask(task: Task): Promise<void> {
  console.log('[AI Worker] Executing task:', { id: task.id, title: task.title, status: task.status });

  const tasksDir = await getTasksDirectoryAsync();

  // Update status to IN_PROGRESS
  workerStatus.currentTask = task.id;
  workerStatus.currentTaskTitle = task.title;

  broadcast({
    type: 'task:started',
    payload: {
      taskId: task.id,
      taskTitle: task.title,
      timestamp: new Date().toISOString(),
      status: workerStatus,
    },
  });

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
          broadcast({
            type: 'task:log',
            payload: {
              taskId: task.id,
              timestamp: line.timestamp,
              logLine: line,
            },
          });
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
      // Add AI Work Log entry
      const aiWorkLogEntry = `\n### ${new Date().toISOString()}\n\n작업이 완료되었습니다. (${result.duration}ms)\n\n실행 결과:\n\`\`\`\n${result.stdout.slice(0, 2000)}${result.stdout.length > 2000 ? '\n...(truncated)' : ''}\n\`\`\`\n`;

      const currentTask = await getAllTasks(tasksDir).then(tasks =>
        tasks.find(t => t.id === task.id)
      );

      if (currentTask) {
        await updateTask(
          task.id,
          {
            status: 'IN_REVIEW',
            aiWorkLog: (currentTask.aiWorkLog || '') + aiWorkLogEntry,
          },
          tasksDir
        );
      }

      broadcast({
        type: 'task:completed',
        payload: {
          taskId: task.id,
          taskTitle: task.title,
          timestamp: new Date().toISOString(),
          result,
        },
      });
    } else {
      // Add error to AI Work Log
      const aiWorkLogEntry = `\n### ${new Date().toISOString()}\n\n작업 실패 (종료 코드: ${result.exitCode}, ${result.duration}ms)\n\n에러:\n\`\`\`\n${result.error || result.stderr}\n\`\`\`\n`;

      const currentTask = await getAllTasks(tasksDir).then(tasks =>
        tasks.find(t => t.id === task.id)
      );

      if (currentTask) {
        await updateTask(
          task.id,
          {
            status: 'NEED_FIX',
            aiWorkLog: (currentTask.aiWorkLog || '') + aiWorkLogEntry,
          },
          tasksDir
        );
      }

      broadcast({
        type: 'task:failed',
        payload: {
          taskId: task.id,
          taskTitle: task.title,
          timestamp: new Date().toISOString(),
          message: result.error,
          result,
        },
      });
    }
  } catch (error) {
    // Handle execution error
    const errorMessage = error instanceof Error ? error.message : String(error);

    broadcast({
      type: 'task:failed',
      payload: {
        taskId: task.id,
        taskTitle: task.title,
        timestamp: new Date().toISOString(),
        message: errorMessage,
      },
    });

    // Keep task in original state (don't update status on exception)
    console.error(`Error executing task ${task.id}:`, error);
  } finally {
    workerStatus.currentTask = null;
    workerStatus.currentTaskTitle = undefined;
    workerStatus.lastExecution = new Date().toISOString();
  }
}

// Process the task queue
async function processQueue(): Promise<void> {
  if (taskQueue.length === 0 || isExecuting() || workerStatus.isPaused) {
    return;
  }

  const item = taskQueue.shift();
  if (!item) return;

  workerStatus.queueLength = taskQueue.length;
  await executeTask(item.task);
}

// Poll for new tasks
async function pollForTasks(): Promise<void> {
  if (workerStatus.isPaused || isExecuting()) {
    return;
  }

  workerStatus.lastCheck = new Date().toISOString();

  try {
    const eligibleTasks = await findEligibleTasks();

    // Add new tasks to queue
    for (const task of eligibleTasks) {
      addToQueue(task);
    }

    // Process the queue
    await processQueue();
  } catch (error) {
    console.error('Error polling for tasks:', error);
    broadcast({
      type: 'error',
      payload: {
        message: error instanceof Error ? error.message : 'Failed to poll for tasks',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Start the worker
export async function startWorker(config?: Partial<AIWorkerConfig>): Promise<AIWorkerStatus> {
  if (workerStatus.isRunning) {
    return workerStatus;
  }

  // Check if Claude is available
  const isAvailable = await checkClaudeAvailable();
  if (!isAvailable) {
    throw new Error('Claude Code CLI is not available. Please install it first.');
  }

  // Load config from file and merge with provided config
  const savedConfig = await getAIWorkerConfig();
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

  broadcast({
    type: 'worker:started',
    payload: {
      timestamp: new Date().toISOString(),
      status: workerStatus,
    },
  });

  return workerStatus;
}

// Stop the worker
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

  broadcast({
    type: 'worker:stopped',
    payload: {
      timestamp: new Date().toISOString(),
      status: workerStatus,
    },
  });

  return workerStatus;
}

// Pause the worker
export function pauseWorker(): AIWorkerStatus {
  if (!workerStatus.isRunning || workerStatus.isPaused) {
    return workerStatus;
  }

  workerStatus.isPaused = true;

  broadcast({
    type: 'worker:paused',
    payload: {
      timestamp: new Date().toISOString(),
      status: workerStatus,
    },
  });

  return workerStatus;
}

// Resume the worker
export function resumeWorker(): AIWorkerStatus {
  if (!workerStatus.isRunning || !workerStatus.isPaused) {
    return workerStatus;
  }

  workerStatus.isPaused = false;

  // Resume processing
  pollForTasks();

  broadcast({
    type: 'worker:resumed',
    payload: {
      timestamp: new Date().toISOString(),
      status: workerStatus,
    },
  });

  return workerStatus;
}

// Force check for tasks (manual trigger)
export async function triggerCheck(): Promise<void> {
  if (!workerStatus.isRunning) {
    throw new Error('Worker is not running');
  }

  await pollForTasks();
}

// Update worker config
export function updateWorkerConfig(config: Partial<AIWorkerConfig>): AIWorkerConfig {
  workerConfig = {
    ...workerConfig,
    ...config,
  };

  // Restart polling if interval changed
  if (config.pollingInterval && pollingInterval && workerStatus.isRunning) {
    clearInterval(pollingInterval);
    pollingInterval = setInterval(pollForTasks, workerConfig.pollingInterval);
  }

  return workerConfig;
}

// Export for testing
export const _testing = {
  isEligibleForAI,
  findEligibleTasks,
  executeTask,
  pollForTasks,
};
