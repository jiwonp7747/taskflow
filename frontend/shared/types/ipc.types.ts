/**
 * IPC Channel Type Definitions
 *
 * Main Process와 Renderer Process 간 IPC 통신 계약 정의
 */

// ============================================================================
// Re-export existing types
// ============================================================================

// Task Types
export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskAssignee,
  TaskCreateRequest,
  TaskUpdateRequest,
  FileWatchEvent,
  TaskFilter,
  DatePreset,
} from '../../types/task';

// Config Types
export type {
  AppConfig,
  SourceConfig,
  AddSourceRequest,
  UpdateSourceRequest,
} from '../../types/config';

// AI Types
export type {
  AIWorkerConfig,
  AIWorkerStatus,
  TaskExecutionLog,
  LogLine,
  ExecutionResult,
} from '../../types/ai';

// ============================================================================
// IPC Channel Definitions
// ============================================================================

/**
 * Invoke Channels (Request-Response Pattern)
 */
export interface IPCInvokeChannels {
  // Tasks
  'tasks:getAll': {
    request: void;
    response: import('../../types/task').Task[];
  };
  'tasks:getById': {
    request: { id: string };
    response: import('../../types/task').Task | null;
  };
  'tasks:create': {
    request: import('../../types/task').TaskCreateRequest;
    response: import('../../types/task').Task;
  };
  'tasks:update': {
    request: { id: string; data: import('../../types/task').TaskUpdateRequest };
    response: import('../../types/task').Task;
  };
  'tasks:delete': {
    request: { id: string };
    response: void;
  };

  // Config
  'config:get': {
    request: void;
    response: import('../../types/config').AppConfig;
  };
  'config:update': {
    request: Partial<import('../../types/config').AppConfig>;
    response: import('../../types/config').AppConfig;
  };

  // Sources
  'sources:getAll': {
    request: void;
    response: import('../../types/config').SourceConfig[];
  };
  'sources:add': {
    request: { path: string; name: string };
    response: import('../../types/config').SourceConfig;
  };
  'sources:update': {
    request: { id: string; data: import('../../types/config').UpdateSourceRequest };
    response: import('../../types/config').SourceConfig;
  };
  'sources:delete': {
    request: { id: string };
    response: void;
  };
  'sources:setActive': {
    request: { id: string };
    response: void;
  };

  // AI Worker
  'ai:start': {
    request: Partial<import('../../types/ai').AIWorkerConfig> | void;
    response: import('../../types/ai').AIWorkerStatus;
  };
  'ai:stop': {
    request: void;
    response: import('../../types/ai').AIWorkerStatus;
  };
  'ai:pause': {
    request: void;
    response: import('../../types/ai').AIWorkerStatus;
  };
  'ai:resume': {
    request: void;
    response: import('../../types/ai').AIWorkerStatus;
  };
  'ai:getStatus': {
    request: void;
    response: import('../../types/ai').AIWorkerStatus;
  };
  'ai:getQueue': {
    request: void;
    response: QueueItem[];
  };
  'ai:getLogs': {
    request: { taskId: string };
    response: import('../../types/ai').TaskExecutionLog | null;
  };

  // Dialog
  'dialog:selectFolder': {
    request: void;
    response: string | null;
  };

  // App
  'app:getVersion': {
    request: void;
    response: string;
  };
}

/**
 * Event Channels (Main → Renderer)
 */
export interface IPCEventChannels {
  'file:changed': import('../../types/task').FileWatchEvent;
  'ai:statusChanged': import('../../types/ai').AIWorkerStatus;
  'ai:taskStarted': TaskStartedPayload;
  'ai:taskCompleted': TaskCompletedPayload;
  'ai:taskFailed': TaskFailedPayload;
  'ai:log': LogPayload;
}

// ============================================================================
// Payload Types
// ============================================================================

export interface QueueItem {
  taskId: string;
  taskTitle: string;
  queuedAt: string;
}

export interface TaskStartedPayload {
  taskId: string;
  taskTitle: string;
  timestamp: string;
}

export interface TaskCompletedPayload {
  taskId: string;
  taskTitle: string;
  timestamp: string;
  duration: number;
  success: boolean;
}

export interface TaskFailedPayload {
  taskId: string;
  taskTitle: string;
  timestamp: string;
  error: string;
}

export interface LogPayload {
  taskId: string;
  line: import('../../types/ai').LogLine;
}

// ============================================================================
// Error Types
// ============================================================================

export interface IPCError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface IPCResult<T> {
  success: boolean;
  data?: T;
  error?: IPCError;
}

// Error codes
export const IPC_ERROR_CODES = {
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_ACCESS_ERROR: 'FILE_ACCESS_ERROR',
  DB_ERROR: 'DB_ERROR',
  AI_WORKER_ERROR: 'AI_WORKER_ERROR',
  CLAUDE_NOT_FOUND: 'CLAUDE_NOT_FOUND',
  SOURCE_NOT_FOUND: 'SOURCE_NOT_FOUND',
  INVALID_PATH: 'INVALID_PATH',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type IPCErrorCode = typeof IPC_ERROR_CODES[keyof typeof IPC_ERROR_CODES];

// ============================================================================
// Type Helpers
// ============================================================================

export type InvokeChannel = keyof IPCInvokeChannels;
export type EventChannel = keyof IPCEventChannels;

export type InvokeRequest<C extends InvokeChannel> = IPCInvokeChannels[C]['request'];
export type InvokeResponse<C extends InvokeChannel> = IPCInvokeChannels[C]['response'];
export type EventPayload<C extends EventChannel> = IPCEventChannels[C];
