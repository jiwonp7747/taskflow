/**
 * Claude Executor Service for Electron Main Process
 *
 * Claude Code CLI 실행 및 관리
 */

import { spawn, type ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import type {
  ExecutorOptions,
  ExecutionResult,
  LogLine,
  TaskExecutionLog,
} from '../../types/ai';
import { safeLog, safeError } from '../lib/safeConsole';

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
 * Get the Claude CLI command (can be overridden by environment variable)
 */
function getClaudeCommand(): string {
  return process.env.CLAUDE_CODE_PATH || 'claude';
}

/**
 * Build the prompt for Claude
 */
function buildPrompt(options: ExecutorOptions): string {
  const { taskId, taskTitle, taskContent, prompt } = options;

  let fullPrompt = `다음 태스크를 수행해주세요:

태스크 ID: ${taskId}
제목: ${taskTitle}

${taskContent}`;

  if (prompt) {
    fullPrompt += `\n\n추가 지시사항:\n${prompt}`;
  }

  fullPrompt += `\n\n작업 완료 후 결과를 상세히 설명해주세요.`;

  return fullPrompt;
}

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
 * Execute Claude Code CLI
 */
export async function executeClaudeCode(
  options: ExecutorOptions,
  callbacks?: {
    onLog?: (line: LogLine) => void;
  }
): Promise<ExecutionResult> {
  const { taskId, taskTitle, workingDirectory, timeout } = options;

  // Check if already executing
  if (activeExecution) {
    throw new Error(`Already executing task: ${activeExecution.taskId}`);
  }

  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  // Initialize execution log
  const log: TaskExecutionLog = {
    taskId,
    taskTitle,
    startedAt,
    logLines: [],
  };

  const prompt = buildPrompt(options);

  // Create the child process
  const claudeCommand = getClaudeCommand();
  const args = ['--print', '--dangerously-skip-permissions'];

  // Only use shell on Windows
  const isWindows = process.platform === 'win32';

  return new Promise<ExecutionResult>((resolve, reject) => {
    const childProcess = spawn(claudeCommand, args, {
      cwd: workingDirectory,
      shell: isWindows,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    });

    safeLog('[ClaudeExecutor] Process spawned, PID:', childProcess.pid);

    // Write prompt to stdin
    childProcess.stdin?.write(prompt);
    childProcess.stdin?.end();
    safeLog('[ClaudeExecutor] Prompt written to stdin, length:', prompt.length);

    // Set up active execution state
    activeExecution = {
      process: childProcess,
      taskId,
      log,
      startTime,
    };

    let stdout = '';
    let stderr = '';

    // Helper to add log line
    const addLogLine = (
      type: 'stdout' | 'stderr' | 'system',
      content: string
    ) => {
      const line: LogLine = {
        timestamp: new Date().toISOString(),
        type,
        content,
      };
      log.logLines.push(line);
      callbacks?.onLog?.(line);
      sendLogToWindows(taskId, line);
    };

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (activeExecution?.process) {
        addLogLine('system', `Timeout after ${timeout}ms, killing process...`);
        activeExecution.process.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (activeExecution?.process) {
            activeExecution.process.kill('SIGKILL');
          }
        }, 5000);
      }
    }, timeout);

    // Handle stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;

      const lines = text.split('\n');
      lines.forEach((line) => {
        if (line.trim()) {
          addLogLine('stdout', line);
        }
      });
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;

      const lines = text.split('\n');
      lines.forEach((line) => {
        if (line.trim()) {
          addLogLine('stderr', line);
        }
      });
    });

    // Handle process exit
    childProcess.on('close', (code) => {
      safeLog('[ClaudeExecutor] Process closed with code:', code);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const completedAt = new Date().toISOString();
      const exitCode = code ?? -1;
      const success = exitCode === 0;

      // Update log
      log.completedAt = completedAt;
      log.duration = duration;
      log.success = success;
      log.exitCode = exitCode;

      const result: ExecutionResult = {
        success,
        exitCode,
        stdout,
        stderr,
        duration,
        startedAt,
        completedAt,
      };

      if (!success && stderr) {
        result.error = stderr;
        log.error = stderr;
      }

      addLogLine('system', `Process exited with code ${exitCode} (${duration}ms)`);

      // Clear active execution
      activeExecution = null;

      resolve(result);
    });

    // Handle process error
    childProcess.on('error', (error) => {
      safeError('[ClaudeExecutor] Process error:', error.message);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const completedAt = new Date().toISOString();

      // Update log
      log.completedAt = completedAt;
      log.duration = duration;
      log.success = false;
      log.error = error.message;

      const result: ExecutionResult = {
        success: false,
        exitCode: -1,
        stdout,
        stderr,
        duration,
        error: error.message,
        startedAt,
        completedAt,
      };

      addLogLine('system', `Process error: ${error.message}`);

      // Clear active execution
      activeExecution = null;

      reject(error);
    });
  });
}

/**
 * Check if Claude CLI is available
 */
export async function checkClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const claudeCommand = getClaudeCommand();
    const checkProcess = spawn(claudeCommand, ['--version'], {
      shell: true,
    });

    checkProcess.on('close', (code) => {
      resolve(code === 0);
    });

    checkProcess.on('error', () => {
      resolve(false);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      checkProcess.kill();
      resolve(false);
    }, 5000);
  });
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

  activeExecution.process.kill('SIGTERM');

  // Force kill after 5 seconds
  setTimeout(() => {
    if (activeExecution?.process) {
      activeExecution.process.kill('SIGKILL');
    }
  }, 5000);

  return true;
}

/**
 * Check if executing
 */
export function isExecuting(): boolean {
  return activeExecution !== null;
}
