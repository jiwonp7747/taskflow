import { NextResponse } from 'next/server';
import { stopWorker, getWorkerConfig } from '@/lib/aiWorker';
import type { AIStatusResponse } from '@/types/ai';

// POST /api/ai/stop - Stop the worker
export async function POST() {
  try {
    const status = stopWorker();
    const config = getWorkerConfig();

    const response: AIStatusResponse = {
      status,
      config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error stopping AI worker:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to stop worker',
      },
      { status: 500 }
    );
  }
}
