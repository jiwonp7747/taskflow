import { NextRequest, NextResponse } from 'next/server';
import { sessionManager, type SessionEvent } from '@/lib/sessionManager';
import { getAllTasks, getTasksDirectoryAsync } from '@/lib/fileSystem';
import { errorResponse, ErrorCodes } from '@/lib/api/errors';

// GET - Get session info for a task or stream events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const stream = searchParams.get('stream') === 'true';

  if (stream) {
    // Stream session events via SSE
    const encoder = new TextEncoder();

    const customReadable = new ReadableStream({
      start(controller) {
        const sendEvent = (event: SessionEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        // Send current state
        if (taskId) {
          const session = sessionManager.getSession(taskId);
          if (session) {
            sendEvent({ type: 'session-started', taskId, sessionId: session.sessionId || 'none' });
            // Send all existing messages
            session.messages.forEach(message => {
              sendEvent({ type: 'message', taskId, message });
            });
          }
        }

        // Listen for events
        const eventHandler = (event: SessionEvent) => {
          if (!taskId || event.taskId === taskId) {
            sendEvent(event);
          }
        };

        sessionManager.on('event', eventHandler);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          sessionManager.off('event', eventHandler);
          controller.close();
        });
      },
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Return session info
  if (taskId) {
    const session = sessionManager.getSession(taskId);
    return NextResponse.json({
      session: session ? {
        ...session,
        isActive: sessionManager.isSessionActive(taskId),
      } : null,
    });
  }

  // Return all sessions
  const sessions = sessionManager.getAllSessions().map(s => ({
    ...s,
    isActive: sessionManager.isSessionActive(s.taskId),
  }));
  return NextResponse.json({ sessions });
}

// POST - Start session or send message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, taskId, message } = body;

    if (!taskId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Task ID is required',
        400
      );
    }

    switch (action) {
      case 'start': {
        // Get task info
        const tasksDir = await getTasksDirectoryAsync();
        const tasks = await getAllTasks(tasksDir);
        const task = tasks.find(t => t.id === taskId);

        if (!task) {
          return errorResponse(
            ErrorCodes.TASK_NOT_FOUND,
            'Task not found',
            404
          );
        }

        // Use the current working directory (project root) which should have Claude context
        // tasksDir could be anywhere but Claude needs a directory with .claude context
        const workingDir = process.cwd();
        console.log('[Session API] tasksDir:', tasksDir);
        console.log('[Session API] workingDir:', workingDir);

        await sessionManager.startSession(
          taskId,
          task.title,
          task.rawContent,
          workingDir
        );

        return NextResponse.json({
          success: true,
          session: sessionManager.getSession(taskId),
        });
      }

      case 'message': {
        if (!message) {
          return errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Message is required',
            400
          );
        }

        sessionManager.sendMessage(taskId, message);

        return NextResponse.json({
          success: true,
        });
      }

      case 'stop': {
        sessionManager.stopSession(taskId);

        return NextResponse.json({
          success: true,
        });
      }

      case 'clear': {
        sessionManager.clearSession(taskId);

        return NextResponse.json({
          success: true,
        });
      }

      default:
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid action',
          400
        );
    }
  } catch (error) {
    console.error('[Session API] Error:', error);
    return errorResponse(
      ErrorCodes.AI_SESSION_ERROR,
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
