import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

// Simple test to verify spawn works in Next.js API routes
export async function GET(request: NextRequest) {
  return new Promise((resolve) => {
    console.log('[Test Spawn] Testing spawn...');
    console.log('[Test Spawn] Platform:', process.platform);
    console.log('[Test Spawn] CWD:', process.cwd());

    try {
      // Try to spawn a simple command
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'cmd.exe' : 'echo';
      const args = isWindows ? ['/c', 'echo', 'Hello from spawn'] : ['Hello from spawn'];

      console.log('[Test Spawn] Spawning:', command, args.join(' '));

      const child = spawn(command, args, {
        shell: isWindows,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log('[Test Spawn] stdout:', data.toString());
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.log('[Test Spawn] stderr:', data.toString());
      });

      child.on('error', (error) => {
        console.error('[Test Spawn] Error:', error);
        resolve(NextResponse.json({
          success: false,
          error: error.message,
          platform: process.platform,
          cwd: process.cwd(),
        }));
      });

      child.on('close', (code) => {
        console.log('[Test Spawn] Process closed with code:', code);
        resolve(NextResponse.json({
          success: true,
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          platform: process.platform,
          cwd: process.cwd(),
        }));
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        console.log('[Test Spawn] Timeout');
        child.kill();
        resolve(NextResponse.json({
          success: false,
          error: 'Timeout',
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          platform: process.platform,
          cwd: process.cwd(),
        }));
      }, 5000);

    } catch (error) {
      console.error('[Test Spawn] Catch error:', error);
      resolve(NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: process.platform,
        cwd: process.cwd(),
      }));
    }
  });
}
