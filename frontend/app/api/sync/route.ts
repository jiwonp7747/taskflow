/**
 * Sync API Routes
 *
 * POST /api/sync - Trigger sync for active GitHub source
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSourceService } from '@/infrastructure/container';
import { GitHubApiAdapter } from '@/adapters/github/GitHubApiAdapter';
import { GitHubFileService } from '@/core/application/GitHubFileService';
import { GitHubSyncService } from '@/core/application/GitHubSyncService';

// Singleton instances for sync services
let githubAdapter: GitHubApiAdapter | null = null;
let fileService: GitHubFileService | null = null;
let syncService: GitHubSyncService | null = null;

function getSyncService(): GitHubSyncService {
  if (!githubAdapter) {
    githubAdapter = new GitHubApiAdapter();
  }
  if (!fileService) {
    fileService = new GitHubFileService(githubAdapter);
  }
  if (!syncService) {
    syncService = new GitHubSyncService(githubAdapter, fileService);
  }
  return syncService;
}

interface SyncRequest {
  sourceId?: string; // Optional - uses active source if not provided
  commitMessage?: string;
  action: 'pull' | 'push' | 'sync';
}

/**
 * POST /api/sync
 * Trigger sync operation
 */
export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();
    const sourceService = getSourceService();

    // Get source
    let source;
    if (body.sourceId) {
      source = await sourceService.getSourceById(body.sourceId);
    } else {
      source = await sourceService.getActiveSource();
    }

    if (!source) {
      return NextResponse.json(
        { error: 'No source found' },
        { status: 404 }
      );
    }

    if (!source.isGitHubSource) {
      return NextResponse.json(
        { error: 'Source is not a GitHub source' },
        { status: 400 }
      );
    }

    const sync = getSyncService();
    const commitMessage = body.commitMessage || `TaskFlow sync: ${new Date().toISOString()}`;

    let result;
    switch (body.action) {
      case 'pull':
        result = await sync.pull(source);
        break;
      case 'push':
        result = await sync.push(source, commitMessage);
        break;
      case 'sync':
      default:
        result = await sync.sync(source, commitMessage);
        break;
    }

    // Update lastSynced if successful
    if (result.success) {
      await sourceService.syncGitHubSource(source.id);
    }

    return NextResponse.json({
      success: result.success,
      action: body.action,
      pulled: result.pulled,
      pushed: result.pushed,
      conflicts: result.conflicts.map(c => ({
        path: c.path,
        localSha: c.localSha,
        remoteSha: c.remoteSha,
      })),
      error: result.error,
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
