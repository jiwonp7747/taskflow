import { NextResponse } from 'next/server';
import { getTaskQueue } from '@/lib/aiWorker';
import type { AIQueueResponse } from '@/types/ai';

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
    return NextResponse.json(
      { error: 'Failed to get task queue' },
      { status: 500 }
    );
  }
}
