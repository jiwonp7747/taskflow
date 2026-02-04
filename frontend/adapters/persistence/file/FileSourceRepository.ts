/**
 * FileSourceRepository - 파일 기반 Source 저장소
 *
 * .taskflow.config.json 파일에 Source 데이터를 저장하는 구현체
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Source, SourceProps } from '@/core/domain/entities/Source';
import type { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import type { SourceValidationResult } from '@/core/ports/in/ISourceService';
import { getFileConfigStore, type PersistedSource } from './FileConfigStore';
import type { GitHubSourceConfig, GitHubValidationResult } from '@/core/domain/entities/GitHubSourceConfig';
import { GitHubApiAdapter } from '@/adapters/github/GitHubApiAdapter';

export class FileSourceRepository implements ISourceRepository {
  private store = getFileConfigStore();

  private toEntity(persisted: PersistedSource): Source {
    const props: SourceProps = {
      id: persisted.id,
      name: persisted.name,
      path: persisted.path,
      isActive: persisted.isActive,
      createdAt: new Date(persisted.createdAt),
      lastAccessed: persisted.lastAccessed ? new Date(persisted.lastAccessed) : undefined,
      sourceType: persisted.sourceType || 'local',
      githubConfig: persisted.githubConfig,
      lastSynced: persisted.lastSynced ? new Date(persisted.lastSynced) : undefined,
    };
    return Source.fromPersistence(props);
  }

  private toPersistence(source: Source): PersistedSource {
    return {
      id: source.id,
      name: source.name,
      path: source.path,
      isActive: source.isActive,
      createdAt: source.createdAt.toISOString(),
      lastAccessed: source.lastAccessed?.toISOString(),
      sourceType: source.sourceType,
      githubConfig: source.githubConfig,
      lastSynced: source.lastSynced?.toISOString(),
    };
  }

  async findAll(): Promise<Source[]> {
    const config = await this.store.read();
    return config.sources.map(s => this.toEntity(s));
  }

  async findById(id: string): Promise<Source | null> {
    const config = await this.store.read();
    const found = config.sources.find(s => s.id === id);
    return found ? this.toEntity(found) : null;
  }

  async findActive(): Promise<Source | null> {
    const config = await this.store.read();
    if (!config.activeSourceId) {
      return null;
    }
    const found = config.sources.find(s => s.id === config.activeSourceId);
    return found ? this.toEntity(found) : null;
  }

  async save(source: Source): Promise<void> {
    await this.store.update(config => {
      const persisted = this.toPersistence(source);
      const index = config.sources.findIndex(s => s.id === source.id);

      if (index >= 0) {
        // 업데이트
        config.sources[index] = persisted;
      } else {
        // 새로 추가
        config.sources.push(persisted);
      }

      // isActive 상태에 따라 activeSourceId 동기화
      if (source.isActive) {
        config.activeSourceId = source.id;
        // 다른 Source들의 isActive를 false로 설정
        config.sources.forEach(s => {
          if (s.id !== source.id) {
            s.isActive = false;
          }
        });
      }

      return config;
    });
  }

  async delete(id: string): Promise<void> {
    await this.store.update(config => {
      const index = config.sources.findIndex(s => s.id === id);

      if (index === -1) {
        throw new Error('Source not found');
      }

      config.sources.splice(index, 1);

      // 삭제된 Source가 활성 상태였다면 activeSourceId 처리
      if (config.activeSourceId === id) {
        config.activeSourceId = config.sources[0]?.id || null;
        if (config.sources[0]) {
          config.sources[0].isActive = true;
        }
      }

      return config;
    });
  }

  async existsByPath(sourcePath: string): Promise<boolean> {
    const config = await this.store.read();
    return config.sources.some(s => s.path === sourcePath);
  }

  async existsById(id: string): Promise<boolean> {
    const config = await this.store.read();
    return config.sources.some(s => s.id === id);
  }

  async validatePath(sourcePath: string): Promise<SourceValidationResult> {
    const result: SourceValidationResult = {
      valid: false,
      path: sourcePath,
      exists: false,
      isDirectory: false,
      taskCount: 0,
    };

    try {
      const stats = await fs.stat(sourcePath);
      result.exists = true;
      result.isDirectory = stats.isDirectory();

      if (!result.isDirectory) {
        result.error = 'Path is not a directory';
        return result;
      }

      // 마크다운 파일 수 카운트
      const files = await fs.readdir(sourcePath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      result.taskCount = mdFiles.length;
      result.valid = true;

      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        result.error = 'Directory does not exist';
      } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        result.error = 'Permission denied';
      } else {
        result.error = String(error);
      }
      return result;
    }
  }

  async createDirectory(sourcePath: string): Promise<void> {
    await fs.mkdir(sourcePath, { recursive: true });
  }

  getDefaultTasksPath(): string {
    return path.join(process.cwd(), 'tasks');
  }

  async validateGitHubSource(config: GitHubSourceConfig): Promise<GitHubValidationResult> {
    const adapter = new GitHubApiAdapter();
    return adapter.validateConnection(config);
  }
}
