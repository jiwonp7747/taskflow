/**
 * Claude Executor - Main Implementation
 *
 * Thin wrapper around core ClaudeExecutor module for backward compatibility.
 * This is the main executor used by the Next.js app.
 */

import type { ExecutorOptions, ExecutionResult, LogLine, TaskExecutionLog } from '@/types/ai';
import {
  executeWithSpawn,
  checkClaudeAvailable as coreCheckClaudeAvailable,
  killProcess,
  buildPrompt,
  getClaudeCommand,
  type ActiveExecution as CoreActiveExecution,
} from './claude';

// Event callback types
type OnLogCallback = (line: LogLine) => void;
type OnCompleteCallback = (result: ExecutionResult) => void;
type OnErrorCallback = (error: Error) => void;

// Active execution state
interface ActiveExecution {
  process: import('child_process').ChildProcess;
  taskId: string;
  log: TaskExecutionLog;
  startTime: number;
  onLog?: OnLogCallback;
  onComplete?: OnCompleteCallback;
  onError?: OnErrorCallback;
}

// Store active execution
let activeExecution: ActiveExecution | null = null;

/**
 * Execute Claude Code CLI
 *
 * @param options - Execution options
 * @param callbacks - Optional callbacks for log, completion, and errors
 * @returns Promise that resolves with execution result
 */
export async function executeClaudeCode(
  options: ExecutorOptions,
  callbacks?: {
    onLog?: OnLogCallback;
    onComplete?: OnCompleteCallback;
    onError?: OnErrorCallback;
  }
): Promise<ExecutionResult> {
  const { taskId } = options;

  // Check if already executing
  if (activeExecution) {
    throw new Error(`Already executing task: ${activeExecution.taskId}`);
  }

  // Create ref to store active execution
  const activeExecutionRef = { current: null as CoreActiveExecution | null };

  try {
    const result = await executeWithSpawn(options, callbacks, activeExecutionRef);

    // Map core active execution to local format
    if (activeExecutionRef.current) {
      activeExecution = {
        process: activeExecutionRef.current.process,
        taskId: activeExecutionRef.current.taskId,
        log: activeExecutionRef.current.log,
        startTime: activeExecutionRef.current.startTime,
        onLog: callbacks?.onLog,
        onComplete: callbacks?.onComplete,
        onError: callbacks?.onError,
      };
    }

    return result;
  } finally {
    // Clear active execution
    activeExecution = null;
  }
}

/**
 * Check if Claude CLI is available
 */
export async function checkClaudeAvailable(): Promise<boolean> {
  return coreCheckClaudeAvailable();
}

/**
 * Get the current active execution
 */
export function getActiveExecution(): { taskId: string; log: TaskExecutionLog } | null {
  if (!activeExecution) {
    return null;
  }

  return {
    taskId: activeExecution.taskId,
    log: activeExecution.log,
  };
}

/**
 * Kill the current active execution
 */
export function killActiveExecution(): boolean {
  if (!activeExecution) {
    return false;
  }

  killProcess(activeExecution.process);
  return true;
}

/**
 * Check if executing
 */
export function isExecuting(): boolean {
  return activeExecution !== null;
}

/**
 * Export for testing
 */
export const _testing = {
  buildPrompt,
  getClaudeCommand,
};
