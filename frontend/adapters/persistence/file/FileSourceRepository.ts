/**
 * FileSourceRepository - 파일 기반 Source 저장소
 *
 * .taskflow.config.json 파일에 Source 데이터를 저장하는 구현체
 */

import { Source, SourceProps } from '@/core/domain/entities/Source';
import type { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import { getFileConfigStore, type PersistedSource } from './FileConfigStore';

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
}
