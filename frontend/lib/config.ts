/**
 * Config Library (Legacy Compatibility Layer)
 *
 * 기존 코드와의 호환성을 유지하면서 새로운 헥사고널 아키텍처를 사용하는 래퍼
 * 점진적 마이그레이션을 위해 기존 함수 시그니처를 유지합니다.
 *
 * @deprecated 새로운 코드에서는 infrastructure/container의 서비스를 직접 사용하세요.
 */

import type { SourceConfig, AppConfig, SourceValidationResult } from '@/types/config';
import type { AIWorkerConfig } from '@/types/ai';
import { DEFAULT_CONFIG } from '@/types/config';
import { DEFAULT_AI_WORKER_CONFIG } from '@/types/ai';
import { getSourceService, getConfigService } from '@/infrastructure/container';

// ============================================
// Config Functions (Hexagonal 아키텍처 사용)
// ============================================

/**
 * Config 로드 (Legacy 호환)
 */
export async function loadConfig(): Promise<AppConfig> {
  try {
    const configService = getConfigService();
    const sourceService = getSourceService();

    const appConfig = await configService.getAppConfig();
    const sources = await sourceService.getAllSources();

    // Legacy 형식으로 변환
    const legacySources: SourceConfig[] = sources.map(s => ({
      id: s.id,
      name: s.name,
      path: s.path,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      lastAccessed: s.lastAccessed?.toISOString(),
    }));

    return {
      sources: legacySources,
      activeSourceId: appConfig.activeSourceId,
      theme: appConfig.theme,
      sidebarCollapsed: appConfig.sidebarCollapsed,
      aiWorker: appConfig.aiWorker,
    };
  } catch (error) {
    console.error('Failed to load config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Config 저장 (Legacy 호환)
 * 주의: 이 함수는 전체 Config를 저장하는 대신 부분 업데이트를 수행합니다.
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  const configService = getConfigService();

  // Config 부분만 업데이트
  await configService.updateConfig({
    activeSourceId: config.activeSourceId,
    theme: config.theme,
    sidebarCollapsed: config.sidebarCollapsed,
  });

  // AIWorker 설정 업데이트
  if (config.aiWorker) {
    await configService.updateAIWorkerConfig(config.aiWorker);
  }
}

/**
 * 활성 태스크 디렉토리 경로 조회
 */
export async function getActiveTasksDirectory(): Promise<string> {
  const sourceService = getSourceService();
  return sourceService.getActiveSourcePath();
}

/**
 * Source 경로 유효성 검증
 */
export async function validateSourcePath(sourcePath: string): Promise<SourceValidationResult> {
  const sourceService = getSourceService();
  return sourceService.validatePath(sourcePath);
}

/**
 * 새 Source 추가
 */
export async function addSource(name: string, sourcePath: string): Promise<SourceConfig> {
  const sourceService = getSourceService();
  const source = await sourceService.addSource({ name, path: sourcePath });

  return {
    id: source.id,
    name: source.name,
    path: source.path,
    isActive: source.isActive,
    createdAt: source.createdAt.toISOString(),
    lastAccessed: source.lastAccessed?.toISOString(),
  };
}

/**
 * Source 업데이트
 */
export async function updateSource(id: string, updates: Partial<SourceConfig>): Promise<SourceConfig> {
  const sourceService = getSourceService();
  const source = await sourceService.updateSource(id, {
    name: updates.name,
    path: updates.path,
  });

  return {
    id: source.id,
    name: source.name,
    path: source.path,
    isActive: source.isActive,
    createdAt: source.createdAt.toISOString(),
    lastAccessed: source.lastAccessed?.toISOString(),
  };
}

/**
 * Source 삭제
 */
export async function deleteSource(id: string): Promise<void> {
  const sourceService = getSourceService();
  await sourceService.deleteSource(id);
}

/**
 * 활성 Source 설정
 */
export async function setActiveSource(id: string): Promise<void> {
  const sourceService = getSourceService();
  await sourceService.setActiveSource(id);
}

/**
 * 활성 Source 조회
 */
export async function getActiveSource(): Promise<SourceConfig | null> {
  const sourceService = getSourceService();
  const source = await sourceService.getActiveSource();

  if (!source) {
    return null;
  }

  return {
    id: source.id,
    name: source.name,
    path: source.path,
    isActive: source.isActive,
    createdAt: source.createdAt.toISOString(),
    lastAccessed: source.lastAccessed?.toISOString(),
  };
}

/**
 * Source 디렉토리 생성
 */
export async function createSourceDirectory(sourcePath: string): Promise<void> {
  const sourceService = getSourceService();
  await sourceService.createSourceDirectory(sourcePath);
}

// ============================================
// AI Worker Configuration Functions
// ============================================

/**
 * AI Worker Config 조회
 */
export async function getAIWorkerConfig(): Promise<AIWorkerConfig> {
  try {
    const configService = getConfigService();
    const aiConfig = await configService.getAIWorkerConfig();
    return aiConfig.toJSON();
  } catch {
    return DEFAULT_AI_WORKER_CONFIG;
  }
}

/**
 * AI Worker Config 업데이트
 */
export async function updateAIWorkerConfig(updates: Partial<AIWorkerConfig>): Promise<AIWorkerConfig> {
  const configService = getConfigService();
  const aiConfig = await configService.updateAIWorkerConfig(updates);
  return aiConfig.toJSON();
}

/**
 * AI Worker 활성화/비활성화
 */
export async function setAIWorkerEnabled(enabled: boolean): Promise<void> {
  const configService = getConfigService();
  await configService.setAIWorkerEnabled(enabled);
}

/**
 * AI Worker 자동 시작 설정
 */
export async function setAIWorkerAutoStart(autoStart: boolean): Promise<void> {
  const configService = getConfigService();
  await configService.setAIWorkerAutoStart(autoStart);
}
