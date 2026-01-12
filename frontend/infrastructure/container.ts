/**
 * DI Container
 *
 * 애플리케이션 서비스의 싱글톤 인스턴스를 관리하는 컨테이너
 */

import { SourceService } from '@/core/application/SourceService';
import { ConfigService } from '@/core/application/ConfigService';
import type { ISourceService } from '@/core/ports/in/ISourceService';
import type { IConfigService } from '@/core/ports/in/IConfigService';
import type { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import type { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import { createRepositories, PersistenceType } from './factory';

/**
 * 환경 변수에서 저장소 타입 결정
 */
function getPersistenceType(): PersistenceType {
  const type = process.env.PERSISTENCE_TYPE as PersistenceType;
  if (type && ['file', 'sqlite', 'postgresql'].includes(type)) {
    return type;
  }
  return 'file'; // 기본값
}

/**
 * 환경 변수에서 저장소 옵션 결정
 */
function getPersistenceOptions(): {
  configFilePath?: string;
  dbPath?: string;
  connectionString?: string;
} {
  return {
    configFilePath: process.env.CONFIG_FILE_PATH,
    dbPath: process.env.SQLITE_DB_PATH,
    connectionString: process.env.DATABASE_URL,
  };
}

// 싱글톤 인스턴스
let sourceRepository: ISourceRepository | null = null;
let configRepository: IConfigRepository | null = null;
let sourceService: ISourceService | null = null;
let configService: IConfigService | null = null;

/**
 * Repository 인스턴스 초기화
 */
function initializeRepositories(): void {
  if (!sourceRepository || !configRepository) {
    const type = getPersistenceType();
    const options = getPersistenceOptions();
    const repos = createRepositories(type, options);
    sourceRepository = repos.sourceRepository;
    configRepository = repos.configRepository;
  }
}

/**
 * Source Repository 가져오기
 */
export function getSourceRepository(): ISourceRepository {
  initializeRepositories();
  return sourceRepository!;
}

/**
 * Config Repository 가져오기
 */
export function getConfigRepository(): IConfigRepository {
  initializeRepositories();
  return configRepository!;
}

/**
 * Source Service 가져오기
 */
export function getSourceService(): ISourceService {
  if (!sourceService) {
    initializeRepositories();
    sourceService = new SourceService(sourceRepository!, configRepository!);
  }
  return sourceService;
}

/**
 * Config Service 가져오기
 */
export function getConfigService(): IConfigService {
  if (!configService) {
    initializeRepositories();
    configService = new ConfigService(configRepository!);
  }
  return configService;
}

/**
 * 컨테이너 리셋 (테스트용)
 */
export function resetContainer(): void {
  sourceRepository = null;
  configRepository = null;
  sourceService = null;
  configService = null;
}

/**
 * 커스텀 Repository로 컨테이너 초기화 (테스트용)
 */
export function initializeWithRepositories(
  customSourceRepository: ISourceRepository,
  customConfigRepository: IConfigRepository
): void {
  resetContainer();
  sourceRepository = customSourceRepository;
  configRepository = customConfigRepository;
}
