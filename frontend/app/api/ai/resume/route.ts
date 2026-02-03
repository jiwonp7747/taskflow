import { NextResponse } from 'next/server';
import { resumeWorker, getWorkerConfig } from '@/lib/aiWorker';
import type { AIStatusResponse } from '@/types/ai';
import { errorResponse, ErrorCodes } from '@/lib/api/errors';

// POST /api/ai/resume - Resume the worker
export async function POST() {
  try {
    const status = resumeWorker();
    const config = getWorkerConfig();

    const response: AIStatusResponse = {
      status,
      config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error resuming AI worker:', error);
    return errorResponse(
      ErrorCodes.AI_RESUME_ERROR,
      error instanceof Error ? error.message : 'Failed to resume worker',
      500
    );
  }
}
