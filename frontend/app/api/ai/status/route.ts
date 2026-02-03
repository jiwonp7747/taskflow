import { NextResponse } from 'next/server';
import { getWorkerStatus, getWorkerConfig } from '@/lib/aiWorker';
import type { AIStatusResponse } from '@/types/ai';
import { errorResponse, ErrorCodes } from '@/lib/api/errors';

// GET /api/ai/status - Get worker status
export async function GET() {
  try {
    const status = getWorkerStatus();
    const config = getWorkerConfig();

    const response: AIStatusResponse = {
      status,
      config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting AI worker status:', error);
    return errorResponse(
      ErrorCodes.AI_STATUS_ERROR,
      'Failed to get worker status',
      500
    );
  }
}
