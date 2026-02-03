import { NextResponse } from 'next/server';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    error: { code, message, ...(details && { details }) },
  };
}

export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse<ApiError> {
  return NextResponse.json(createApiError(code, message, details), { status });
}

// Common error codes
export const ErrorCodes = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Not found errors
  NOT_FOUND: 'NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  SOURCE_NOT_FOUND: 'SOURCE_NOT_FOUND',

  // Configuration errors
  NO_SOURCE_CONFIGURED: 'NO_SOURCE_CONFIGURED',
  CONFIG_LOAD_ERROR: 'CONFIG_LOAD_ERROR',
  CONFIG_UPDATE_ERROR: 'CONFIG_UPDATE_ERROR',

  // Task operation errors
  TASKS_FETCH_ERROR: 'TASKS_FETCH_ERROR',
  TASK_FETCH_ERROR: 'TASK_FETCH_ERROR',
  TASK_CREATE_ERROR: 'TASK_CREATE_ERROR',
  TASK_UPDATE_ERROR: 'TASK_UPDATE_ERROR',
  TASK_DELETE_ERROR: 'TASK_DELETE_ERROR',

  // Source operation errors
  SOURCE_ADD_ERROR: 'SOURCE_ADD_ERROR',
  SOURCE_DELETE_ERROR: 'SOURCE_DELETE_ERROR',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',
  DIRECTORY_CREATE_ERROR: 'DIRECTORY_CREATE_ERROR',
  INVALID_PATH: 'INVALID_PATH',

  // AI worker errors
  AI_START_ERROR: 'AI_START_ERROR',
  AI_STOP_ERROR: 'AI_STOP_ERROR',
  AI_PAUSE_ERROR: 'AI_PAUSE_ERROR',
  AI_RESUME_ERROR: 'AI_RESUME_ERROR',
  AI_STATUS_ERROR: 'AI_STATUS_ERROR',
  AI_LOGS_ERROR: 'AI_LOGS_ERROR',
  AI_QUEUE_ERROR: 'AI_QUEUE_ERROR',
  AI_SESSION_ERROR: 'AI_SESSION_ERROR',

  // Watch errors
  WATCH_ERROR: 'WATCH_ERROR',

  // Test/Debug errors
  SPAWN_ERROR: 'SPAWN_ERROR',
  SPAWN_TIMEOUT: 'SPAWN_TIMEOUT',
  CLAUDE_EXEC_ERROR: 'CLAUDE_EXEC_ERROR',

  // Source operation errors (continued)
  SOURCE_GET_ERROR: 'SOURCE_GET_ERROR',
  SOURCE_UPDATE_ERROR: 'SOURCE_UPDATE_ERROR',
  SET_ACTIVE_ERROR: 'SET_ACTIVE_ERROR',

  // Internal errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
