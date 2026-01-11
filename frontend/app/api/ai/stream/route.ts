import { NextResponse } from 'next/server';
import { subscribe, getWorkerStatus, getWorkerConfig } from '@/lib/aiWorker';
import type { WSMessage } from '@/types/ai';

// GET /api/ai/stream - SSE endpoint for AI worker events
export async function GET(): Promise<Response> {
  const status = getWorkerStatus();
  const config = getWorkerConfig();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE message
      const sendMessage = (data: unknown) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream might be closed
        }
      };

      // Send initial connection message with current status
      sendMessage({
        type: 'connected',
        payload: {
          timestamp: new Date().toISOString(),
          status,
          config,
        },
      });

      // Subscribe to worker events
      const unsubscribe = subscribe((message: WSMessage) => {
        try {
          sendMessage(message);
        } catch {
          // Stream might be closed
          unsubscribe();
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          sendMessage({
            type: 'heartbeat',
            payload: {
              timestamp: new Date().toISOString(),
              status: getWorkerStatus(),
            },
          });
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
}
