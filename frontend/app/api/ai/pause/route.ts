import { NextResponse } from 'next/server';
import { pauseWorker, getWorkerConfig } from '@/lib/aiWorker';
import type { AIStatusResponse } from '@/types/ai';
import { errorResponse, ErrorCodes } from '@/lib/api/errors';

// POST /api/ai/pause - Pause the worker
export async function POST() {
  try {
    const status = pauseWorker();
    const config = getWorkerConfig();

    const response: AIStatusResponse = {
      status,
      config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error pausing AI worker:', error);
    return errorResponse(
      ErrorCodes.AI_PAUSE_ERROR,
      error instanceof Error ? error.message : 'Failed to pause worker',
      500
    );
  }
}
