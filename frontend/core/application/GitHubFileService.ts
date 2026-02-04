/**
 * GitHubFileService - GitHub 파일 작업 서비스
 *
 * GitHub 저장소의 마크다운 파일 읽기/쓰기 및 캐시 관리
 */

import type { Source } from '@/core/domain/entities/Source';
import type { IGitHubAdapter } from '@/core/ports/out/IGitHubAdapter';
import type { GitHubContent, GitHubFileContent } from '@/core/domain/entities/GitHubSourceConfig';

export interface CachedFile {
  path: string;
  content: string;
  sha: string;
  cachedAt: Date;
  isDirty: boolean;
  localContent?: string; // Modified content not yet pushed
}

export interface GitHubFileCache {
  sourceId: string;
  files: Map<string, CachedFile>;
  lastRefresh: Date;
}

export class GitHubFileService {
  private caches: Map<string, GitHubFileCache> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private githubAdapter: IGitHubAdapter) {}

  /**
   * 소스의 모든 마크다운 파일 목록 조회
   */
  async listMarkdownFiles(source: Source): Promise<GitHubContent[]> {
    if (!source.isGitHubSource || !source.githubConfig) {
      throw new Error('Source is not a GitHub source');
    }

    return this.githubAdapter.getMarkdownFiles(source.githubConfig);
  }

  /**
   * 파일 내용 읽기 (캐시 우선)
   */
  async readFile(source: Source, path: string): Promise<string> {
    if (!source.isGitHubSource || !source.githubConfig) {
      throw new Error('Source is not a GitHub source');
    }

    const cache = this.getCache(source.id);
    const cached = cache.files.get(path);

    // Return dirty local content if exists
    if (cached?.isDirty && cached.localContent !== undefined) {
      return cached.localContent;
    }

    // Return cached if fresh
    if (cached && this.isCacheFresh(cached)) {
      return cached.content;
    }

    // Fetch from GitHub
    const fileContent = await this.githubAdapter.getFileContent(
      source.githubConfig,
      path
    );

    // Update cache
    cache.files.set(path, {
      path,
      content: fileContent.content,
      sha: fileContent.sha,
      cachedAt: new Date(),
      isDirty: false,
    });

    return fileContent.content;
  }

  /**
   * 파일 내용 수정 (로컬 캐시에만 저장, push 전까지)
   */
  updateFileLocally(source: Source, path: string, content: string): void {
    const cache = this.getCache(source.id);
    const existing = cache.files.get(path);

    if (existing) {
      existing.localContent = content;
      existing.isDirty = true;
    } else {
      // New file
      cache.files.set(path, {
        path,
        content: '',
        sha: '',
        cachedAt: new Date(),
        isDirty: true,
        localContent: content,
      });
    }
  }

  /**
   * 변경된 파일들 GitHub에 push
   */
  async pushChanges(source: Source, commitMessage: string): Promise<void> {
    if (!source.isGitHubSource || !source.githubConfig) {
      throw new Error('Source is not a GitHub source');
    }

    const cache = this.getCache(source.id);
    const dirtyFiles = Array.from(cache.files.values()).filter(f => f.isDirty);

    if (dirtyFiles.length === 0) {
      return; // Nothing to push
    }

    for (const file of dirtyFiles) {
      if (file.localContent === undefined) continue;

      const result = await this.githubAdapter.createOrUpdateFile(
        source.githubConfig,
        file.path,
        file.localContent,
        commitMessage,
        file.sha || undefined, // undefined for new files
      );

      // Update cache with new SHA
      file.content = file.localContent;
      file.sha = result.sha;
      file.isDirty = false;
      file.localContent = undefined;
      file.cachedAt = new Date();
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(source: Source, path: string, commitMessage: string): Promise<void> {
    if (!source.isGitHubSource || !source.githubConfig) {
      throw new Error('Source is not a GitHub source');
    }

    const cache = this.getCache(source.id);
    const cached = cache.files.get(path);

    if (!cached?.sha) {
      // Need to fetch SHA first
      const fileContent = await this.githubAdapter.getFileContent(
        source.githubConfig,
        path
      );
      await this.githubAdapter.deleteFile(
        source.githubConfig,
        path,
        commitMessage,
        fileContent.sha
      );
    } else {
      await this.githubAdapter.deleteFile(
        source.githubConfig,
        path,
        commitMessage,
        cached.sha
      );
    }

    cache.files.delete(path);
  }

  /**
   * 변경된 파일 목록 조회
   */
  getDirtyFiles(source: Source): CachedFile[] {
    const cache = this.getCache(source.id);
    return Array.from(cache.files.values()).filter(f => f.isDirty);
  }

  /**
   * 변경사항 있는지 확인
   */
  hasUnsavedChanges(source: Source): boolean {
    return this.getDirtyFiles(source).length > 0;
  }

  /**
   * 캐시 무효화
   */
  invalidateCache(sourceId: string): void {
    this.caches.delete(sourceId);
  }

  /**
   * 전체 캐시 새로고침
   */
  async refreshCache(source: Source): Promise<void> {
    if (!source.isGitHubSource || !source.githubConfig) {
      throw new Error('Source is not a GitHub source');
    }

    const files = await this.githubAdapter.getMarkdownFiles(source.githubConfig);
    const cache = this.getCache(source.id);

    // Preserve dirty files
    const dirtyFiles = new Map<string, CachedFile>();
    cache.files.forEach((file, path) => {
      if (file.isDirty) {
        dirtyFiles.set(path, file);
      }
    });

    // Reset cache
    cache.files.clear();
    cache.lastRefresh = new Date();

    // Restore dirty files
    dirtyFiles.forEach((file, path) => {
      cache.files.set(path, file);
    });

    // Add file entries (content will be fetched on demand)
    for (const file of files) {
      if (!cache.files.has(file.path)) {
        cache.files.set(file.path, {
          path: file.path,
          content: '',
          sha: file.sha,
          cachedAt: new Date(0), // Force refresh on first read
          isDirty: false,
        });
      }
    }
  }

  private getCache(sourceId: string): GitHubFileCache {
    let cache = this.caches.get(sourceId);
    if (!cache) {
      cache = {
        sourceId,
        files: new Map(),
        lastRefresh: new Date(0),
      };
      this.caches.set(sourceId, cache);
    }
    return cache;
  }

  private isCacheFresh(cached: CachedFile): boolean {
    return Date.now() - cached.cachedAt.getTime() < this.CACHE_TTL_MS;
  }
}
