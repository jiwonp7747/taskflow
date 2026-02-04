/**
 * GitHubSyncService - GitHub 동기화 서비스
 *
 * 로컬 캐시와 GitHub 저장소 간의 동기화 처리
 * 3-way merge를 통한 충돌 해결
 */

import type { Source } from '@/core/domain/entities/Source';
import type { IGitHubAdapter } from '@/core/ports/out/IGitHubAdapter';
import type { GitHubFileService, CachedFile } from './GitHubFileService';

export interface SyncConflict {
  path: string;
  localContent: string;
  remoteContent: string;
  baseContent: string; // Common ancestor
  localSha: string;
  remoteSha: string;
}

export interface SyncResult {
  success: boolean;
  pulled: string[];      // Files updated from remote
  pushed: string[];      // Files pushed to remote
  conflicts: SyncConflict[];
  error?: string;
}

export interface MergeResult {
  success: boolean;
  content?: string;
  hasConflicts: boolean;
  conflictMarkers?: string; // Content with conflict markers
}

export class GitHubSyncService {
  constructor(
    private githubAdapter: IGitHubAdapter,
    private fileService: GitHubFileService
  ) {}

  /**
   * Pull: 원격 변경사항을 로컬로 동기화
   */
  async pull(source: Source): Promise<SyncResult> {
    if (!source.isGitHubSource || !source.githubConfig) {
      throw new Error('Source is not a GitHub source');
    }

    const result: SyncResult = {
      success: true,
      pulled: [],
      pushed: [],
      conflicts: [],
    };

    try {
      // Get all remote files
      const remoteFiles = await this.githubAdapter.getMarkdownFiles(source.githubConfig);
      const dirtyFiles = this.fileService.getDirtyFiles(source);
      const dirtyPaths = new Set(dirtyFiles.map(f => f.path));

      for (const remoteFile of remoteFiles) {
        // Skip files with local changes - will handle in sync
        if (dirtyPaths.has(remoteFile.path)) {
          continue;
        }

        // Fetch and cache new content
        const content = await this.githubAdapter.getFileContent(
          source.githubConfig,
          remoteFile.path
        );

        // Update through file service (this updates cache)
        await this.fileService.readFile(source, remoteFile.path);
        result.pulled.push(remoteFile.path);
      }

      return result;
    } catch (error) {
      return {
        ...result,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Push: 로컬 변경사항을 원격으로 동기화
   */
  async push(source: Source, commitMessage: string): Promise<SyncResult> {
    if (!source.isGitHubSource || !source.githubConfig) {
      throw new Error('Source is not a GitHub source');
    }

    const result: SyncResult = {
      success: true,
      pulled: [],
      pushed: [],
      conflicts: [],
    };

    try {
      const dirtyFiles = this.fileService.getDirtyFiles(source);

      if (dirtyFiles.length === 0) {
        return result;
      }

      // Check for conflicts before pushing
      for (const file of dirtyFiles) {
        const conflict = await this.checkConflict(source, file);
        if (conflict) {
          result.conflicts.push(conflict);
        }
      }

      if (result.conflicts.length > 0) {
        result.success = false;
        result.error = `${result.conflicts.length} conflict(s) detected. Resolve before pushing.`;
        return result;
      }

      // Push changes
      await this.fileService.pushChanges(source, commitMessage);
      result.pushed = dirtyFiles.map(f => f.path);

      return result;
    } catch (error) {
      return {
        ...result,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Sync: Pull + Push with conflict detection
   */
  async sync(source: Source, commitMessage: string): Promise<SyncResult> {
    // First pull
    const pullResult = await this.pull(source);
    if (!pullResult.success) {
      return pullResult;
    }

    // Then push
    const pushResult = await this.push(source, commitMessage);

    return {
      success: pushResult.success,
      pulled: pullResult.pulled,
      pushed: pushResult.pushed,
      conflicts: pushResult.conflicts,
      error: pushResult.error,
    };
  }

  /**
   * Check if a file has conflicts with remote
   */
  private async checkConflict(
    source: Source,
    cachedFile: CachedFile
  ): Promise<SyncConflict | null> {
    if (!source.githubConfig) return null;

    try {
      // Get current remote content
      const remoteContent = await this.githubAdapter.getFileContent(
        source.githubConfig,
        cachedFile.path
      );

      // If SHA matches, no conflict
      if (remoteContent.sha === cachedFile.sha) {
        return null;
      }

      // SHA differs - remote was modified
      return {
        path: cachedFile.path,
        localContent: cachedFile.localContent || cachedFile.content,
        remoteContent: remoteContent.content,
        baseContent: cachedFile.content, // Original content when we cached
        localSha: cachedFile.sha,
        remoteSha: remoteContent.sha,
      };
    } catch (error: any) {
      // File doesn't exist remotely - new file, no conflict
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Simple 3-way merge (line-based)
   * Returns merged content or content with conflict markers
   */
  merge(conflict: SyncConflict): MergeResult {
    const baseLines = conflict.baseContent.split('\n');
    const localLines = conflict.localContent.split('\n');
    const remoteLines = conflict.remoteContent.split('\n');

    const mergedLines: string[] = [];
    let hasConflicts = false;

    const maxLength = Math.max(baseLines.length, localLines.length, remoteLines.length);

    for (let i = 0; i < maxLength; i++) {
      const baseLine = baseLines[i] ?? '';
      const localLine = localLines[i] ?? '';
      const remoteLine = remoteLines[i] ?? '';

      if (localLine === remoteLine) {
        // Both same - use either
        mergedLines.push(localLine);
      } else if (localLine === baseLine) {
        // Only remote changed - use remote
        mergedLines.push(remoteLine);
      } else if (remoteLine === baseLine) {
        // Only local changed - use local
        mergedLines.push(localLine);
      } else {
        // Both changed differently - conflict
        hasConflicts = true;
        mergedLines.push('<<<<<<< LOCAL');
        mergedLines.push(localLine);
        mergedLines.push('=======');
        mergedLines.push(remoteLine);
        mergedLines.push('>>>>>>> REMOTE');
      }
    }

    const content = mergedLines.join('\n');

    return {
      success: !hasConflicts,
      content: hasConflicts ? undefined : content,
      hasConflicts,
      conflictMarkers: hasConflicts ? content : undefined,
    };
  }

  /**
   * Resolve conflict by choosing a version
   */
  async resolveConflict(
    source: Source,
    conflict: SyncConflict,
    resolution: 'local' | 'remote' | 'merged',
    mergedContent?: string
  ): Promise<void> {
    let finalContent: string;

    switch (resolution) {
      case 'local':
        finalContent = conflict.localContent;
        break;
      case 'remote':
        finalContent = conflict.remoteContent;
        break;
      case 'merged':
        if (!mergedContent) {
          throw new Error('Merged content required for merged resolution');
        }
        finalContent = mergedContent;
        break;
    }

    // Update local cache with resolved content
    this.fileService.updateFileLocally(source, conflict.path, finalContent);
  }
}
