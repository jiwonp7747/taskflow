/**
 * Core Claude Executor Module
 *
 * Unified execution logic for Claude Code CLI across all contexts.
 * Supports both async streaming (spawn) and blocking (execSync) modes.
 */

import { spawn, execSync, type ChildProcess } from 'child_process';
import type { ExecutorOptions, ExecutionResult, LogLine, TaskExecutionLog } from '@/types/ai';

/**
 * Execution mode
 */
export type ExecutionMode = 'spawn' | 'execSync';

/**
 * Core execution callbacks
 */
export interface ExecutionCallbacks {
  onLog?: (line: LogLine) => void;
  onComplete?: (result: ExecutionResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Active execution state for spawn mode
 */
export interface ActiveExecution {
  process: ChildProcess;
  taskId: string;
  log: TaskExecutionLog;
  startTime: number;
  callbacks?: ExecutionCallbacks;
}

/**
 * Get the Claude CLI command (can be overridden by environment variable)
 */
export function getClaudeCommand(): string {
  return process.env.CLAUDE_CODE_PATH || 'claude';
}

/**
 * Build the prompt for Claude
 */
export function buildPrompt(options: ExecutorOptions): string {
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
 * Build Claude CLI arguments
 */
export function buildClaudeArgs(options?: { resumeSessionId?: string }): string[] {
  const args = ['--print', '--dangerously-skip-permissions'];

  if (options?.resumeSessionId) {
    args.push('--resume', options.resumeSessionId);
  }

  return args;
}

/**
 * Execute Claude Code CLI using spawn (async, streaming)
 *
 * @param options - Execution options
 * @param callbacks - Optional callbacks for log, completion, and errors
 * @param activeExecutionRef - Optional ref to store active execution state
 * @returns Promise that resolves with execution result
 */
export async function executeWithSpawn(
  options: ExecutorOptions,
  callbacks?: ExecutionCallbacks,
  activeExecutionRef?: { current: ActiveExecution | null }
): Promise<ExecutionResult> {
  const { taskId, taskTitle, workingDirectory, timeout } = options;

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
  const claudeCommand = getClaudeCommand();
  const args = buildClaudeArgs();

  // Only use shell on Windows (prevents command injection on Unix)
  const isWindows = process.platform === 'win32';

  return new Promise<ExecutionResult>((resolve, reject) => {
    const childProcess = spawn(claudeCommand, args, {
      cwd: workingDirectory,
      shell: isWindows,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1', // Preserve colors in output
      },
    });

    // Write prompt to stdin (safer than command line args - olly-molly pattern)
    childProcess.stdin?.write(prompt);
    childProcess.stdin?.end();

    // Store active execution state if ref provided
    const activeExecution: ActiveExecution = {
      process: childProcess,
      taskId,
      log,
      startTime,
      callbacks,
    };

    if (activeExecutionRef) {
      activeExecutionRef.current = activeExecution;
    }

    let stdout = '';
    let stderr = '';

    // Helper to add log line
    const addLogLine = (type: 'stdout' | 'stderr' | 'system', content: string) => {
      const line: LogLine = {
        timestamp: new Date().toISOString(),
        type,
        content,
      };
      log.logLines.push(line);
      callbacks?.onLog?.(line);
    };

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (childProcess && !childProcess.killed) {
        addLogLine('system', `Timeout after ${timeout}ms, killing process...`);
        childProcess.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (childProcess && !childProcess.killed) {
            childProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    }, timeout);

    // Handle stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;

      // Split by lines and log each
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          addLogLine('stdout', line);
        }
      });
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;

      // Split by lines and log each
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          addLogLine('stderr', line);
        }
      });
    });

    // Handle process exit
    childProcess.on('close', (code) => {
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

      // Clear active execution ref
      if (activeExecutionRef) {
        activeExecutionRef.current = null;
      }

      callbacks?.onComplete?.(result);
      resolve(result);
    });

    // Handle process error
    childProcess.on('error', (error) => {
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

      // Clear active execution ref
      if (activeExecutionRef) {
        activeExecutionRef.current = null;
      }

      callbacks?.onError?.(error);
      reject(error);
    });
  });
}

/**
 * Execute Claude Code CLI using execSync (blocking, synchronous)
 *
 * @param prompt - The prompt to send to Claude
 * @param workingDirectory - Working directory for the command
 * @param resumeSessionId - Optional session ID to resume
 * @returns The output from Claude
 * @throws Error if execution fails
 */
export function executeWithExecSync(
  prompt: string,
  workingDirectory: string,
  resumeSessionId?: string
): string {
  const claudeCommand = getClaudeCommand();
  const args = buildClaudeArgs({ resumeSessionId });

  // Escape the prompt for command line
  const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const fullCommand = `${claudeCommand} ${args.join(' ')} "${escapedPrompt}"`;

  const result = execSync(fullCommand, {
    cwd: workingDirectory,
    encoding: 'utf-8',
    timeout: 300000, // 5 minutes timeout
    maxBuffer: 50 * 1024 * 1024, // 50MB
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
  });

  return result;
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
 * Kill a process gracefully (SIGTERM then SIGKILL after 5s)
 */
export function killProcess(process: ChildProcess): void {
  if (!process || process.killed) {
    return;
  }

  process.kill('SIGTERM');

  // Force kill after 5 seconds
  setTimeout(() => {
    if (process && !process.killed) {
      process.kill('SIGKILL');
    }
  }, 5000);
}
