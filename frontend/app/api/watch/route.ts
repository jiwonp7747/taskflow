import { NextResponse } from 'next/server';
import { fileWatcher, startWatching } from '@/lib/fileWatcher';
import { getTasksDirectoryAsync } from '@/lib/fileSystem';
import type { FileWatchEvent } from '@/types/task';
import { errorResponse, ErrorCodes } from '@/lib/api/errors';

// GET /api/watch - SSE endpoint for file changes
export async function GET(): Promise<Response> {
  try {
    const directory = await getTasksDirectoryAsync();

  // Start watching if not already
  startWatching(directory);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ type: 'connected', directory })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Subscribe to file changes
      const unsubscribe = fileWatcher.subscribe((event: FileWatchEvent) => {
        const message = `data: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream might be closed
          unsubscribe();
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 30000);

      // Cleanup on stream close
      return () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
      };
    },
  });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error starting file watcher:', error);
    return errorResponse(
      ErrorCodes.WATCH_ERROR,
      'Failed to start file watcher',
      500
    );
  }
}
