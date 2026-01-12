/**
 * IConfigService - Config 서비스 인터페이스 (Input Port)
 *
 * Config 관련 유스케이스를 정의하는 인터페이스
 */

import type { Config, ThemeType } from '@/core/domain/entities/Config';
import type { AIWorkerConfig, CreateAIWorkerConfigInput } from '@/core/domain/entities/AIWorkerConfig';

// DTO
export interface UpdateConfigDTO {
  activeSourceId?: string | null;
  theme?: ThemeType;
  sidebarCollapsed?: boolean;
}

// 전체 AppConfig를 반환하기 위한 인터페이스
export interface AppConfigDTO {
  activeSourceId: string | null;
  theme: ThemeType;
  sidebarCollapsed: boolean;
  aiWorker: {
    enabled: boolean;
    autoStart: boolean;
    pollingInterval: number;
    maxConcurrent: number;
    timeout: number;
    workingDirectory?: string;
  };
}

export interface IConfigService {
  /**
   * Config 로드
   */
  getConfig(): Promise<Config>;

  /**
   * 전체 AppConfig 로드 (Sources 제외, AIWorkerConfig 포함)
   */
  getAppConfig(): Promise<AppConfigDTO>;

  /**
   * Config 업데이트
   */
  updateConfig(dto: UpdateConfigDTO): Promise<Config>;

  /**
   * 활성 Source ID 설정
   */
  setActiveSourceId(sourceId: string | null): Promise<void>;

  /**
   * 사이드바 토글
   */
  toggleSidebar(): Promise<void>;

  /**
   * 테마 설정
   */
  setTheme(theme: ThemeType): Promise<void>;

  // AI Worker Config 관련
  /**
   * AI Worker Config 로드
   */
  getAIWorkerConfig(): Promise<AIWorkerConfig>;

  /**
   * AI Worker Config 업데이트
   */
  updateAIWorkerConfig(updates: CreateAIWorkerConfigInput): Promise<AIWorkerConfig>;

  /**
   * AI Worker 활성화/비활성화
   */
  setAIWorkerEnabled(enabled: boolean): Promise<void>;

  /**
   * AI Worker 자동 시작 설정
   */
  setAIWorkerAutoStart(autoStart: boolean): Promise<void>;
}
