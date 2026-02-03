import { NextResponse } from 'next/server';
import { getTaskQueue } from '@/lib/aiWorker';
import type { AIQueueResponse } from '@/types/ai';
import { errorResponse, ErrorCodes } from '@/lib/api/errors';

// GET /api/ai/queue - Get task queue
export async function GET() {
  try {
    const queue = getTaskQueue();

    const response: AIQueueResponse = {
      queue,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting task queue:', error);
    return errorResponse(
      ErrorCodes.AI_QUEUE_ERROR,
      'Failed to get task queue',
      500
    );
  }
}
