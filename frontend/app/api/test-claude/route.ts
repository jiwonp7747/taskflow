import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { errorResponse, ErrorCodes } from '@/lib/api/errors';

// Test Claude CLI using execSync
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[Test Claude] Testing Claude with execSync...');
  console.log('[Test Claude] Platform:', process.platform);
  console.log('[Test Claude] CWD:', process.cwd());

  try {
    const claudeCommand = process.env.CLAUDE_CODE_PATH || 'claude';
    const fullCommand = `${claudeCommand} --print --dangerously-skip-permissions hello`;

    console.log('[Test Claude] Command:', fullCommand);

    const result = execSync(fullCommand, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
    });

    console.log('[Test Claude] Result:', result?.substring(0, 200));

    return NextResponse.json({
      success: true,
      response: result?.substring(0, 1000) || '',
      platform: process.platform,
      cwd: process.cwd(),
    });

  } catch (error: unknown) {
    const err = error as { message?: string; stdout?: Buffer; stderr?: Buffer; status?: number };
    console.error('[Test Claude] Error:', err.message);
    return errorResponse(
      'CLAUDE_EXEC_ERROR',
      err.message || 'Unknown error',
      500,
      {
        stdout: err.stdout?.toString().substring(0, 500) || '',
        stderr: err.stderr?.toString().substring(0, 500) || '',
        status: err.status,
        platform: process.platform,
        cwd: process.cwd(),
      }
    );
  }
}
