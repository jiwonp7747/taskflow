import { NextRequest, NextResponse } from 'next/server';
import { sessionManager, type SessionEvent } from '@/lib/sessionManager';
import { getAllTasks, getTasksDirectoryAsync } from '@/lib/fileSystem';

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
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    switch (action) {
      case 'start': {
        // Get task info
        const tasksDir = await getTasksDirectoryAsync();
        const tasks = await getAllTasks(tasksDir);
        const task = tasks.find(t => t.id === taskId);

        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        await sessionManager.startSession(
          taskId,
          task.title,
          task.rawContent,
          tasksDir.replace('/todo', '') // Use project root as working directory
        );

        return NextResponse.json({
          success: true,
          session: sessionManager.getSession(taskId),
        });
      }

      case 'message': {
        if (!message) {
          return NextResponse.json({ error: 'Message is required' }, { status: 400 });
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
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
