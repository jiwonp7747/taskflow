import { NextResponse } from 'next/server';
import { stopWorker, getWorkerConfig } from '@/lib/aiWorker';
import type { AIStatusResponse } from '@/types/ai';
import { errorResponse, ErrorCodes } from '@/lib/api/errors';

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
    return errorResponse(
      ErrorCodes.AI_STOP_ERROR,
      error instanceof Error ? error.message : 'Failed to stop worker',
      500
    );
  }
}
