/**
 * Claude Executor Service for Electron Main Process
 *
 * Extends core ClaudeExecutor with Electron-specific BrowserWindow integration.
 */

import type { ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import type {
  ExecutorOptions,
  ExecutionResult,
  LogLine,
  TaskExecutionLog,
} from '../../types/ai';
import { safeLog, safeError } from '../lib/safeConsole';
import {
  executeWithSpawn,
  checkClaudeAvailable as coreCheckClaudeAvailable,
  killProcess,
  type ActiveExecution as CoreActiveExecution,
} from '../../lib/claude';

// Active execution state
interface ActiveExecution {
  process: ChildProcess;
  taskId: string;
  log: TaskExecutionLog;
  startTime: number;
}

// Store active execution
let activeExecution: ActiveExecution | null = null;

/**
 * Send log line to all renderer windows
 */
function sendLogToWindows(taskId: string, line: LogLine): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((window) => {
    try {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send('ai:log', { taskId, line });
      }
    } catch {
      // Window or webContents may have been destroyed between check and send
    }
  });
}

/**
 * Execute Claude Code CLI with BrowserWindow integration
 *
 * @param options - Execution options
 * @param callbacks - Optional callbacks for log events
 * @returns Promise that resolves with execution result
 */
export async function executeClaudeCode(
  options: ExecutorOptions,
  callbacks?: {
    onLog?: (line: LogLine) => void;
  }
): Promise<ExecutionResult> {
  const { taskId } = options;

  // Check if already executing
  if (activeExecution) {
    throw new Error(`Already executing task: ${activeExecution.taskId}`);
  }

  // Create ref to store active execution
  const activeExecutionRef = { current: null as CoreActiveExecution | null };

  // Enhanced callbacks that also send to BrowserWindows
  const enhancedCallbacks = {
    onLog: (line: LogLine) => {
      callbacks?.onLog?.(line);
      sendLogToWindows(taskId, line);
    },
  };

  try {
    safeLog('[ClaudeExecutor] Starting execution for task:', taskId);

    const result = await executeWithSpawn(options, enhancedCallbacks, activeExecutionRef);

    // Map core active execution to local format
    if (activeExecutionRef.current) {
      activeExecution = {
        process: activeExecutionRef.current.process,
        taskId: activeExecutionRef.current.taskId,
        log: activeExecutionRef.current.log,
        startTime: activeExecutionRef.current.startTime,
      };
    }

    safeLog('[ClaudeExecutor] Execution completed:', result.success);

    return result;
  } catch (error) {
    safeError('[ClaudeExecutor] Execution failed:', error);
    throw error;
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
export function getActiveExecution(): {
  taskId: string;
  log: TaskExecutionLog;
} | null {
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
