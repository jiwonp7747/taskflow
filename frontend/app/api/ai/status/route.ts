import { NextResponse } from 'next/server';
import { getWorkerStatus, getWorkerConfig } from '@/lib/aiWorker';
import type { AIStatusResponse } from '@/types/ai';

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
    return NextResponse.json(
      { error: 'Failed to get worker status' },
      { status: 500 }
    );
  }
}
