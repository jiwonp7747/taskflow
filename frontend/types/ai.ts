// AI Worker Configuration Types

export interface AIWorkerConfig {
  enabled: boolean;
  autoStart: boolean;
  pollingInterval: number;   // ms, default: 30000
  maxConcurrent: number;     // default: 1
  timeout: number;           // ms, default: 600000 (10 minutes)
  workingDirectory?: string; // optional, defaults to process.cwd()
}

export const DEFAULT_AI_WORKER_CONFIG: AIWorkerConfig = {
  enabled: true,
  autoStart: false,
  pollingInterval: 30000,
  maxConcurrent: 1,
  timeout: 600000,
};

// AI Worker Status
export interface AIWorkerStatus {
  isRunning: boolean;
  isPaused: boolean;
  currentTask: string | null;
  currentTaskTitle?: string;
  queueLength: number;
  lastCheck: string | null;
  lastExecution: string | null;
  startedAt: string | null;
}

export const INITIAL_AI_WORKER_STATUS: AIWorkerStatus = {
  isRunning: false,
  isPaused: false,
  currentTask: null,
  queueLength: 0,
  lastCheck: null,
  lastExecution: null,
  startedAt: null,
};

// Claude Executor Options
export interface ExecutorOptions {
  taskId: string;
  taskTitle: string;
  taskContent: string;       // Full markdown content
  workingDirectory: string;
  timeout: number;
  prompt?: string;           // Additional prompt
}

// Execution Result
export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;          // ms
  error?: string;
  startedAt: string;
  completedAt: string;
}

// Task Execution Log Entry
export interface TaskExecutionLog {
  taskId: string;
  taskTitle: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  success?: boolean;
  exitCode?: number;
  error?: string;
  logLines: LogLine[];
}

export interface LogLine {
  timestamp: string;
  type: 'stdout' | 'stderr' | 'system';
  content: string;
}

// WebSocket Message Types
export type WSMessageType =
  | 'connected'
  | 'heartbeat'
  | 'worker:status'
  | 'worker:started'
  | 'worker:stopped'
  | 'worker:paused'
  | 'worker:resumed'
  | 'task:started'
  | 'task:log'
  | 'task:completed'
  | 'task:failed'
  | 'task:queued'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  payload: {
    taskId?: string;
    taskTitle?: string;
    message?: string;
    timestamp: string;
    data?: unknown;
    logLine?: LogLine;
    status?: AIWorkerStatus;
    config?: AIWorkerConfig;
    result?: ExecutionResult;
  };
}

// API Request/Response Types
export interface AIStartRequest {
  config?: Partial<AIWorkerConfig>;
}

export interface AIStatusResponse {
  status: AIWorkerStatus;
  config: AIWorkerConfig;
}

export interface AILogsResponse {
  taskId: string;
  log: TaskExecutionLog | null;
}

export interface AIQueueResponse {
  queue: Array<{
    taskId: string;
    taskTitle: string;
    queuedAt: string;
  }>;
}
