/**
 * SourceService - Source 관리 애플리케이션 서비스
 *
 * Source 관련 비즈니스 로직을 처리하는 서비스
 */

import { Source } from '@/core/domain/entities/Source';
import type { GitHubSourceConfig, GitHubValidationResult } from '@/core/domain/entities/GitHubSourceConfig';
import type { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import type { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import type {
  ISourceService,
  AddSourceDTO,
  AddGitHubSourceDTO,
  UpdateSourceDTO,
  SourceValidationResult,
} from '@/core/ports/in/ISourceService';

export class SourceService implements ISourceService {
  constructor(
    private sourceRepository: ISourceRepository,
    private configRepository: IConfigRepository,
  ) {}

  async getAllSources(): Promise<Source[]> {
    return this.sourceRepository.findAll();
  }

  async getSourceById(id: string): Promise<Source | null> {
    return this.sourceRepository.findById(id);
  }

  async getActiveSource(): Promise<Source | null> {
    return this.sourceRepository.findActive();
  }

  async getActiveSourcePath(): Promise<string> {
    const activeSource = await this.sourceRepository.findActive();
    if (activeSource) {
      return activeSource.path;
    }
    // 기본 tasks 디렉토리 반환
    return this.sourceRepository.getDefaultTasksPath();
  }

  async addSource(dto: AddSourceDTO): Promise<Source> {
    // 중복 경로 체크
    const exists = await this.sourceRepository.existsByPath(dto.path);
    if (exists) {
      throw new Error('Source with this path already exists');
    }

    // 현재 Source 목록 조회
    const sources = await this.sourceRepository.findAll();
    const isFirstSource = sources.length === 0;

    // 새 Source 생성
    const source = Source.create({
      name: dto.name,
      path: dto.path,
      isActive: isFirstSource, // 첫 번째면 자동 활성화
    });

    // 저장
    await this.sourceRepository.save(source);

    // 첫 번째 Source면 Config에도 반영
    if (isFirstSource) {
      const config = await this.configRepository.loadConfig();
      config.setActiveSource(source.id);
      await this.configRepository.saveConfig(config);
    }

    return source;
  }

  async updateSource(id: string, dto: UpdateSourceDTO): Promise<Source> {
    const source = await this.sourceRepository.findById(id);
    if (!source) {
      throw new Error('Source not found');
    }

    // 경로 변경 시 중복 체크
    if (dto.path && dto.path !== source.path) {
      const exists = await this.sourceRepository.existsByPath(dto.path);
      if (exists) {
        throw new Error('Source with this path already exists');
      }
      source.updatePath(dto.path);
    }

    if (dto.name) {
      source.updateName(dto.name);
    }

    await this.sourceRepository.save(source);
    return source;
  }

  async deleteSource(id: string): Promise<void> {
    const source = await this.sourceRepository.findById(id);
    if (!source) {
      throw new Error('Source not found');
    }

    const wasActive = source.isActive;
    await this.sourceRepository.delete(id);

    // 활성 Source였다면 다른 Source를 활성화
    if (wasActive) {
      const remainingSources = await this.sourceRepository.findAll();
      const config = await this.configRepository.loadConfig();

      if (remainingSources.length > 0) {
        const newActive = remainingSources[0];
        newActive.activate();
        await this.sourceRepository.save(newActive);
        config.setActiveSource(newActive.id);
      } else {
        config.setActiveSource(null);
      }

      await this.configRepository.saveConfig(config);
    }
  }

  async setActiveSource(id: string): Promise<void> {
    const source = await this.sourceRepository.findById(id);
    if (!source) {
      throw new Error('Source not found');
    }

    // 현재 활성 Source 비활성화
    const currentActive = await this.sourceRepository.findActive();
    if (currentActive && currentActive.id !== id) {
      currentActive.deactivate();
      await this.sourceRepository.save(currentActive);
    }

    // 새 Source 활성화
    source.activate();
    await this.sourceRepository.save(source);

    // Config 업데이트
    const config = await this.configRepository.loadConfig();
    config.setActiveSource(id);
    await this.configRepository.saveConfig(config);
  }

  async validatePath(sourcePath: string): Promise<SourceValidationResult> {
    return this.sourceRepository.validatePath(sourcePath);
  }

  async createSourceDirectory(sourcePath: string): Promise<void> {
    await this.sourceRepository.createDirectory(sourcePath);
  }

  async addGitHubSource(dto: AddGitHubSourceDTO): Promise<Source> {
    // Generate virtual path for uniqueness check
    const { owner, repo, rootPath } = dto.githubConfig;
    const virtualPath = `github://${owner}/${repo}${rootPath}`;

    // 중복 경로 체크
    const exists = await this.sourceRepository.existsByPath(virtualPath);
    if (exists) {
      throw new Error('GitHub source with this repository and path already exists');
    }

    // GitHub 연결 유효성 검증
    const validation = await this.sourceRepository.validateGitHubSource(dto.githubConfig);
    if (!validation.valid) {
      throw new Error(`GitHub validation failed: ${validation.error}`);
    }

    // 현재 Source 목록 조회
    const sources = await this.sourceRepository.findAll();
    const isFirstSource = sources.length === 0;

    // 새 GitHub Source 생성
    const source = Source.createGitHubSource({
      name: dto.name,
      githubConfig: dto.githubConfig,
      isActive: isFirstSource,
    });

    // 저장
    await this.sourceRepository.save(source);

    // 첫 번째 Source면 Config에도 반영
    if (isFirstSource) {
      const config = await this.configRepository.loadConfig();
      config.setActiveSource(source.id);
      await this.configRepository.saveConfig(config);
    }

    return source;
  }

  async validateGitHubSource(config: GitHubSourceConfig): Promise<GitHubValidationResult> {
    return this.sourceRepository.validateGitHubSource(config);
  }

  async syncGitHubSource(id: string): Promise<void> {
    const source = await this.sourceRepository.findById(id);
    if (!source) {
      throw new Error('Source not found');
    }

    if (!source.isGitHubSource || !source.githubConfig) {
      throw new Error('Source is not a GitHub source');
    }

    // Update lastSynced timestamp
    source.updateLastSynced();
    await this.sourceRepository.save(source);

    // Note: Actual file sync logic will be implemented in GitHubSyncService
  }
}
