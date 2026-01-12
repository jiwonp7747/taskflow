/**
 * IConfigRepository - Config 저장소 인터페이스 (Output Port)
 *
 * Config 및 AIWorkerConfig 엔티티의 영속성을 담당하는 저장소 인터페이스
 * 구현체: FileConfigRepository, SQLiteConfigRepository, PgConfigRepository 등
 */

import type { Config } from '@/core/domain/entities/Config';
import type { AIWorkerConfig } from '@/core/domain/entities/AIWorkerConfig';

export interface IConfigRepository {
  /**
   * Config 로드
   */
  loadConfig(): Promise<Config>;

  /**
   * Config 저장
   */
  saveConfig(config: Config): Promise<void>;

  /**
   * AIWorkerConfig 로드
   */
  loadAIWorkerConfig(): Promise<AIWorkerConfig>;

  /**
   * AIWorkerConfig 저장
   */
  saveAIWorkerConfig(config: AIWorkerConfig): Promise<void>;
}
