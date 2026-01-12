import { execSync } from 'child_process';
import { EventEmitter } from 'events';

// Message types
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface TaskSession {
  taskId: string;
  sessionId: string | null;  // Claude's --resume session ID
  messages: ConversationMessage[];
  isActive: boolean;
  startedAt: string;
  lastActivityAt: string;
  workingDirectory?: string;
}

// Session events
export type SessionEvent =
  | { type: 'message'; taskId: string; message: ConversationMessage }
  | { type: 'stream'; taskId: string; content: string; messageId: string }
  | { type: 'stream-end'; taskId: string; messageId: string }
  | { type: 'session-started'; taskId: string; sessionId: string }
  | { type: 'session-ended'; taskId: string }
  | { type: 'error'; taskId: string; error: string };

// Session manager singleton - supports multiple concurrent sessions per task
class SessionManager extends EventEmitter {
  private sessions: Map<string, TaskSession> = new Map();
  private runningTasks: Set<string> = new Set();

  constructor() {
    super();
  }

  // Get or create session for a task
  getSession(taskId: string): TaskSession | null {
    return this.sessions.get(taskId) || null;
  }

  // Get all sessions
  getAllSessions(): TaskSession[] {
    return Array.from(this.sessions.values());
  }

  // Check if a task has an active session
  isSessionActive(taskId: string): boolean {
    return this.runningTasks.has(taskId);
  }

  // Start a new session for a task
  async startSession(taskId: string, taskTitle: string, taskContent: string, workingDirectory: string): Promise<void> {
    console.log('[SessionManager] Starting session for task:', taskId);

    // Get existing session if any (preserves message history)
    let session = this.sessions.get(taskId);

    if (!session) {
      session = {
        taskId,
        sessionId: null,
        messages: [],
        isActive: false,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        workingDirectory,
      };
      this.sessions.set(taskId, session);
    }

    session.isActive = true;
    session.workingDirectory = workingDirectory;
    session.lastActivityAt = new Date().toISOString();

    this.emit('event', { type: 'session-started', taskId, sessionId: session.sessionId || 'new' } as SessionEvent);

    // Add system message
    const systemMessage: ConversationMessage = {
      id: this.generateId(),
      role: 'system',
      content: `태스크 세션 시작: ${taskTitle}`,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(systemMessage);
    this.emit('event', { type: 'message', taskId, message: systemMessage } as SessionEvent);

    // Build initial prompt
    const initialPrompt = `다음 태스크를 수행해주세요:

태스크 ID: ${taskId}
제목: ${taskTitle}

${taskContent}

작업을 시작하기 전에 계획을 간략히 설명해주세요.`;

    // Execute with initial prompt
    await this.executeClaudeCommand(taskId, initialPrompt, workingDirectory);
  }

  // Execute a Claude command for a task using execSync
  private async executeClaudeCommand(taskId: string, prompt: string, workingDirectory: string): Promise<void> {
    const session = this.sessions.get(taskId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message
    const userMessage: ConversationMessage = {
      id: this.generateId(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMessage);
    this.emit('event', { type: 'message', taskId, message: userMessage } as SessionEvent);

    // Create placeholder for assistant response
    const assistantMessageId = this.generateId();
    const assistantMessage: ConversationMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };
    session.messages.push(assistantMessage);
    this.emit('event', { type: 'message', taskId, message: assistantMessage } as SessionEvent);

    // Mark task as running
    this.runningTasks.add(taskId);

    // Build Claude command
    const claudeCommand = process.env.CLAUDE_CODE_PATH || 'claude';

    // Escape the prompt for command line
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');

    let args = ['--print', '--dangerously-skip-permissions'];

    // If we have a session ID, resume it
    if (session.sessionId) {
      args.push('--resume', session.sessionId);
    }

    const fullCommand = `${claudeCommand} ${args.join(' ')} "${escapedPrompt}"`;

    console.log('[SessionManager] Executing command (truncated):', fullCommand.substring(0, 100) + '...');
    console.log('[SessionManager] Working directory:', workingDirectory);

    try {
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

      console.log('[SessionManager] Command completed, response length:', result?.length || 0);

      // Update assistant message with the response
      assistantMessage.content = result || 'No response from Claude';
      assistantMessage.isStreaming = false;

      // Emit stream event with full content
      this.emit('event', {
        type: 'stream',
        taskId,
        content: assistantMessage.content,
        messageId: assistantMessageId,
      } as SessionEvent);

      // Emit stream end
      this.emit('event', {
        type: 'stream-end',
        taskId,
        messageId: assistantMessageId,
      } as SessionEvent);

    } catch (error: any) {
      console.error('[SessionManager] Command failed:', error.message);

      // Update assistant message with error
      assistantMessage.content = `오류 발생: ${error.message}`;
      assistantMessage.isStreaming = false;

      this.emit('event', {
        type: 'stream',
        taskId,
        content: assistantMessage.content,
        messageId: assistantMessageId,
      } as SessionEvent);

      this.emit('event', {
        type: 'stream-end',
        taskId,
        messageId: assistantMessageId,
      } as SessionEvent);

      this.emit('event', { type: 'error', taskId, error: error.message } as SessionEvent);
    } finally {
      this.runningTasks.delete(taskId);
      session.lastActivityAt = new Date().toISOString();
    }
  }

  // Send a message to a task's session
  async sendMessage(taskId: string, content: string): Promise<void> {
    const session = this.sessions.get(taskId);
    if (!session) {
      throw new Error('Session not found');
    }

    const workingDirectory = session.workingDirectory || process.cwd();
    await this.executeClaudeCommand(taskId, content, workingDirectory);
  }

  // Stop a session for a specific task
  stopSession(taskId: string): void {
    const session = this.sessions.get(taskId);

    if (session) {
      session.isActive = false;
    }

    this.runningTasks.delete(taskId);
    this.emit('event', { type: 'session-ended', taskId } as SessionEvent);
  }

  // Clear session data for a task
  clearSession(taskId: string): void {
    this.stopSession(taskId);
    this.sessions.delete(taskId);
  }

  // Generate unique ID
  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export types
export type { SessionEvent as SessionEventType };
