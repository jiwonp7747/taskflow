import { spawn, type ChildProcess } from 'child_process';
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
}

// Session events
export type SessionEvent =
  | { type: 'message'; taskId: string; message: ConversationMessage }
  | { type: 'stream'; taskId: string; content: string; messageId: string }
  | { type: 'stream-end'; taskId: string; messageId: string }
  | { type: 'session-started'; taskId: string; sessionId: string }
  | { type: 'session-ended'; taskId: string }
  | { type: 'error'; taskId: string; error: string };

// Active process state
interface ActiveProcess {
  process: ChildProcess;
  taskId: string;
  currentMessageId: string | null;
  buffer: string;
}

// Session manager singleton
class SessionManager extends EventEmitter {
  private sessions: Map<string, TaskSession> = new Map();
  private activeProcess: ActiveProcess | null = null;

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
    return this.activeProcess?.taskId === taskId;
  }

  // Start a new session for a task
  async startSession(taskId: string, taskTitle: string, taskContent: string, workingDirectory: string): Promise<void> {
    // Check if already has an active session for different task
    if (this.activeProcess && this.activeProcess.taskId !== taskId) {
      throw new Error(`Another session is active for task: ${this.activeProcess.taskId}`);
    }

    // Get existing session if any
    let session = this.sessions.get(taskId);

    if (!session) {
      session = {
        taskId,
        sessionId: null,
        messages: [],
        isActive: false,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      this.sessions.set(taskId, session);
    }

    // Build Claude args
    const claudeCommand = process.env.CLAUDE_CODE_PATH || 'claude';
    const args: string[] = [
      '--dangerously-skip-permissions',
    ];

    // If we have a session ID, resume it
    if (session.sessionId) {
      args.push('--resume', session.sessionId);
    }

    // Spawn Claude process
    const isWindows = process.platform === 'win32';
    const childProcess = spawn(claudeCommand, args, {
      cwd: workingDirectory,
      shell: isWindows,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '0', // Disable colors for cleaner parsing
      },
    });

    console.log('[SessionManager] Process spawned, PID:', childProcess.pid);

    this.activeProcess = {
      process: childProcess,
      taskId,
      currentMessageId: null,
      buffer: '',
    };

    session.isActive = true;
    session.lastActivityAt = new Date().toISOString();

    // If this is a new session, send the initial task context
    if (!session.sessionId) {
      const initialPrompt = `다음 태스크를 수행해주세요:

태스크 ID: ${taskId}
제목: ${taskTitle}

${taskContent}

작업을 시작하기 전에 계획을 간략히 설명해주세요.`;

      // Add system message
      const systemMessage: ConversationMessage = {
        id: this.generateId(),
        role: 'system',
        content: `태스크 세션 시작: ${taskTitle}`,
        timestamp: new Date().toISOString(),
      };
      session.messages.push(systemMessage);
      this.emit('event', { type: 'message', taskId, message: systemMessage } as SessionEvent);

      // Send initial prompt
      this.sendMessage(taskId, initialPrompt);
    }

    // Handle stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      this.handleOutput(taskId, data.toString());
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[SessionManager] stderr:', data.toString());
    });

    // Handle process exit
    childProcess.on('close', (code) => {
      console.log('[SessionManager] Process closed with code:', code);
      this.handleProcessExit(taskId);
    });

    // Handle process error
    childProcess.on('error', (error) => {
      console.error('[SessionManager] Process error:', error);
      this.emit('event', { type: 'error', taskId, error: error.message } as SessionEvent);
      this.handleProcessExit(taskId);
    });

    this.emit('event', { type: 'session-started', taskId, sessionId: session.sessionId || 'new' } as SessionEvent);
  }

  // Send a message to the active session
  sendMessage(taskId: string, content: string): void {
    if (!this.activeProcess || this.activeProcess.taskId !== taskId) {
      throw new Error('No active session for this task');
    }

    const session = this.sessions.get(taskId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message
    const userMessage: ConversationMessage = {
      id: this.generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMessage);
    session.lastActivityAt = new Date().toISOString();
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
    this.activeProcess.currentMessageId = assistantMessageId;
    this.emit('event', { type: 'message', taskId, message: assistantMessage } as SessionEvent);

    // Send to Claude
    this.activeProcess.process.stdin?.write(content + '\n');
    console.log('[SessionManager] Sent message:', content.substring(0, 100) + '...');
  }

  // Handle Claude output
  private handleOutput(taskId: string, text: string): void {
    if (!this.activeProcess || this.activeProcess.taskId !== taskId) {
      return;
    }

    const session = this.sessions.get(taskId);
    if (!session) return;

    // Append to buffer
    this.activeProcess.buffer += text;

    // Try to extract session ID if we don't have one
    if (!session.sessionId) {
      const sessionMatch = this.activeProcess.buffer.match(/Session ID: ([a-f0-9-]+)/i);
      if (sessionMatch) {
        session.sessionId = sessionMatch[1];
        console.log('[SessionManager] Captured session ID:', session.sessionId);
      }
    }

    // Stream content to the current message
    if (this.activeProcess.currentMessageId) {
      const message = session.messages.find(m => m.id === this.activeProcess!.currentMessageId);
      if (message) {
        message.content += text;
        message.isStreaming = true;
        this.emit('event', {
          type: 'stream',
          taskId,
          content: text,
          messageId: this.activeProcess.currentMessageId
        } as SessionEvent);
      }
    }

    session.lastActivityAt = new Date().toISOString();
  }

  // Handle process exit
  private handleProcessExit(taskId: string): void {
    const session = this.sessions.get(taskId);
    if (session) {
      session.isActive = false;
      session.lastActivityAt = new Date().toISOString();

      // Mark current message as done streaming
      if (this.activeProcess?.currentMessageId) {
        const message = session.messages.find(m => m.id === this.activeProcess!.currentMessageId);
        if (message) {
          message.isStreaming = false;
        }
        this.emit('event', {
          type: 'stream-end',
          taskId,
          messageId: this.activeProcess.currentMessageId
        } as SessionEvent);
      }
    }

    if (this.activeProcess?.taskId === taskId) {
      this.activeProcess = null;
    }

    this.emit('event', { type: 'session-ended', taskId } as SessionEvent);
  }

  // Stop a session
  stopSession(taskId: string): void {
    if (this.activeProcess?.taskId === taskId) {
      this.activeProcess.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.activeProcess?.taskId === taskId) {
          this.activeProcess.process.kill('SIGKILL');
        }
      }, 5000);
    }
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
