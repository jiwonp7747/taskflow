/**
 * Repository Factory
 *
 * 저장소 타입에 따라 적절한 Repository 구현체를 생성하는 팩토리
 */

import type { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import type { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import { FileSourceRepository, FileConfigRepository } from '@/adapters/persistence/file';
import { SqliteSourceRepository, SqliteConfigRepository } from '@/adapters/persistence/sqlite';

/**
 * 지원되는 저장소 타입
 */
export type PersistenceType = 'file' | 'sqlite' | 'postgresql';

/**
 * Source Repository 생성
 */
export function createSourceRepository(
  type: PersistenceType = 'file',
  options?: { configFilePath?: string; dbPath?: string; connectionString?: string }
): ISourceRepository {
  switch (type) {
    case 'file':
      return new FileSourceRepository(options?.configFilePath);

    case 'sqlite':
      return new SqliteSourceRepository(options?.dbPath);

    case 'postgresql':
      throw new Error('PostgreSQL adapter is not implemented yet. Coming soon!');

    default:
      throw new Error(`Unknown persistence type: ${type}`);
  }
}

/**
 * Config Repository 생성
 */
export function createConfigRepository(
  type: PersistenceType = 'file',
  options?: { configFilePath?: string; dbPath?: string; connectionString?: string }
): IConfigRepository {
  switch (type) {
    case 'file':
      return new FileConfigRepository(options?.configFilePath);

    case 'sqlite':
      return new SqliteConfigRepository(options?.dbPath);

    case 'postgresql':
      throw new Error('PostgreSQL adapter is not implemented yet. Coming soon!');

    default:
      throw new Error(`Unknown persistence type: ${type}`);
  }
}

/**
 * 모든 Repository를 한 번에 생성
 */
export function createRepositories(
  type: PersistenceType = 'file',
  options?: { configFilePath?: string; dbPath?: string; connectionString?: string }
): {
  sourceRepository: ISourceRepository;
  configRepository: IConfigRepository;
} {
  return {
    sourceRepository: createSourceRepository(type, options),
    configRepository: createConfigRepository(type, options),
  };
}
