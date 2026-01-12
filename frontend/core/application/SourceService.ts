/**
 * SourceService - Source 관리 애플리케이션 서비스
 *
 * Source 관련 비즈니스 로직을 처리하는 서비스
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Source } from '@/core/domain/entities/Source';
import type { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import type { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import type {
  ISourceService,
  AddSourceDTO,
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
    return path.join(process.cwd(), 'tasks');
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

  async createSourceDirectory(sourcePath: string): Promise<void> {
    await fs.mkdir(sourcePath, { recursive: true });
  }
}
