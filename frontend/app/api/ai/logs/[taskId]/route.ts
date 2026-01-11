import { NextResponse } from 'next/server';
import { getExecutionLog } from '@/lib/aiWorker';
import type { AILogsResponse } from '@/types/ai';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// GET /api/ai/logs/:taskId - Get execution log for a task
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const log = getExecutionLog(taskId);

    const response: AILogsResponse = {
      taskId,
      log,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting execution log:', error);
    return NextResponse.json(
      { error: 'Failed to get execution log' },
      { status: 500 }
    );
  }
}
