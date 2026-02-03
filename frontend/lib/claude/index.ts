/**
 * Claude Executor - Public API
 *
 * Unified Claude Code CLI execution module
 */

export {
  type ExecutionMode,
  type ExecutionCallbacks,
  type ActiveExecution,
  getClaudeCommand,
  buildPrompt,
  buildClaudeArgs,
  executeWithSpawn,
  executeWithExecSync,
  checkClaudeAvailable,
  killProcess,
} from './ClaudeExecutor';
