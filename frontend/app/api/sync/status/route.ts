/**
 * Sync Status API Route
 *
 * GET /api/sync/status - Get current sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSourceService } from '@/infrastructure/container';
import { GitHubApiAdapter } from '@/adapters/github/GitHubApiAdapter';
import { GitHubFileService } from '@/core/application/GitHubFileService';

// Singleton instances for services
let githubAdapter: GitHubApiAdapter | null = null;
let fileService: GitHubFileService | null = null;

function getFileService(): GitHubFileService {
  if (!githubAdapter) {
    githubAdapter = new GitHubApiAdapter();
  }
  if (!fileService) {
    fileService = new GitHubFileService(githubAdapter);
  }
  return fileService;
}

/**
 * GET /api/sync/status
 * Get current sync status
 */
export async function GET(request: NextRequest) {
  try {
    const sourceService = getSourceService();
    const source = await sourceService.getActiveSource();

    if (!source) {
      return NextResponse.json({
        hasActiveSource: false,
        isGitHubSource: false,
      });
    }

    if (!source.isGitHubSource) {
      return NextResponse.json({
        hasActiveSource: true,
        isGitHubSource: false,
        sourceId: source.id,
        sourceName: source.name,
      });
    }

    const fileSvc = getFileService();
    const dirtyFiles = fileSvc.getDirtyFiles(source);

    return NextResponse.json({
      hasActiveSource: true,
      isGitHubSource: true,
      sourceId: source.id,
      sourceName: source.name,
      lastSynced: source.lastSynced?.toISOString(),
      hasUnsavedChanges: dirtyFiles.length > 0,
      unsavedCount: dirtyFiles.length,
      unsavedFiles: dirtyFiles.map(f => f.path),
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
