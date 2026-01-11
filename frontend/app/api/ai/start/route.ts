import { NextResponse } from 'next/server';
import { startWorker, getWorkerConfig } from '@/lib/aiWorker';
import type { AIWorkerConfig, AIStatusResponse } from '@/types/ai';

// POST /api/ai/start - Start the worker
export async function POST(request: Request) {
  try {
    let config: Partial<AIWorkerConfig> | undefined;

    // Parse optional config from body
    try {
      const body = await request.json();
      if (body.config) {
        config = body.config;
      }
    } catch {
      // No body or invalid JSON, that's fine
    }

    const status = await startWorker(config);
    const workerConfig = getWorkerConfig();

    const response: AIStatusResponse = {
      status,
      config: workerConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error starting AI worker:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to start worker',
      },
      { status: 500 }
    );
  }
}
