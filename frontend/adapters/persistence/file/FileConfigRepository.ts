/**
 * FileConfigRepository - 파일 기반 Config 저장소
 *
 * .taskflow.config.json 파일에 Config 데이터를 저장하는 구현체
 */

import { Config, ConfigProps } from '@/core/domain/entities/Config';
import { AIWorkerConfig } from '@/core/domain/entities/AIWorkerConfig';
import type { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import { getFileConfigStore } from './FileConfigStore';

export class FileConfigRepository implements IConfigRepository {
  private store = getFileConfigStore();

  async loadConfig(): Promise<Config> {
    const fileConfig = await this.store.read();

    const props: ConfigProps = {
      activeSourceId: fileConfig.activeSourceId,
      theme: fileConfig.theme,
      sidebarCollapsed: fileConfig.sidebarCollapsed,
    };

    return Config.fromPersistence(props);
  }

  async saveConfig(config: Config): Promise<void> {
    await this.store.update(fileConfig => {
      // Config 필드만 업데이트 (sources, aiWorker는 유지)
      fileConfig.activeSourceId = config.activeSourceId;
      fileConfig.theme = config.theme;
      fileConfig.sidebarCollapsed = config.sidebarCollapsed;
      return fileConfig;
    });
  }

  async loadAIWorkerConfig(): Promise<AIWorkerConfig> {
    const fileConfig = await this.store.read();
    return AIWorkerConfig.fromPersistence(fileConfig.aiWorker || {});
  }

  async saveAIWorkerConfig(aiWorkerConfig: AIWorkerConfig): Promise<void> {
    await this.store.update(fileConfig => {
      fileConfig.aiWorker = aiWorkerConfig.toPersistence();
      return fileConfig;
    });
  }
}
