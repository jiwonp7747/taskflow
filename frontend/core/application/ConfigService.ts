/**
 * ConfigService - Config 관리 애플리케이션 서비스
 *
 * Config 관련 비즈니스 로직을 처리하는 서비스
 */

import { Config, ThemeType } from '@/core/domain/entities/Config';
import { AIWorkerConfig, CreateAIWorkerConfigInput } from '@/core/domain/entities/AIWorkerConfig';
import type { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import type {
  IConfigService,
  UpdateConfigDTO,
  AppConfigDTO,
} from '@/core/ports/in/IConfigService';

export class ConfigService implements IConfigService {
  constructor(
    private configRepository: IConfigRepository,
  ) {}

  async getConfig(): Promise<Config> {
    return this.configRepository.loadConfig();
  }

  async getAppConfig(): Promise<AppConfigDTO> {
    const config = await this.configRepository.loadConfig();
    const aiWorkerConfig = await this.configRepository.loadAIWorkerConfig();

    return {
      activeSourceId: config.activeSourceId,
      theme: config.theme,
      sidebarCollapsed: config.sidebarCollapsed,
      aiWorker: aiWorkerConfig.toJSON(),
    };
  }

  async updateConfig(dto: UpdateConfigDTO): Promise<Config> {
    const config = await this.configRepository.loadConfig();

    if (dto.activeSourceId !== undefined) {
      config.setActiveSource(dto.activeSourceId);
    }

    if (dto.theme !== undefined) {
      config.setTheme(dto.theme);
    }

    if (dto.sidebarCollapsed !== undefined) {
      config.setSidebarCollapsed(dto.sidebarCollapsed);
    }

    await this.configRepository.saveConfig(config);
    return config;
  }

  async setActiveSourceId(sourceId: string | null): Promise<void> {
    const config = await this.configRepository.loadConfig();
    config.setActiveSource(sourceId);
    await this.configRepository.saveConfig(config);
  }

  async toggleSidebar(): Promise<void> {
    const config = await this.configRepository.loadConfig();
    config.toggleSidebar();
    await this.configRepository.saveConfig(config);
  }

  async setTheme(theme: ThemeType): Promise<void> {
    const config = await this.configRepository.loadConfig();
    config.setTheme(theme);
    await this.configRepository.saveConfig(config);
  }

  // AI Worker Config 관련
  async getAIWorkerConfig(): Promise<AIWorkerConfig> {
    return this.configRepository.loadAIWorkerConfig();
  }

  async updateAIWorkerConfig(updates: CreateAIWorkerConfigInput): Promise<AIWorkerConfig> {
    const aiWorkerConfig = await this.configRepository.loadAIWorkerConfig();
    aiWorkerConfig.update(updates);
    await this.configRepository.saveAIWorkerConfig(aiWorkerConfig);
    return aiWorkerConfig;
  }

  async setAIWorkerEnabled(enabled: boolean): Promise<void> {
    const aiWorkerConfig = await this.configRepository.loadAIWorkerConfig();
    if (enabled) {
      aiWorkerConfig.enable();
    } else {
      aiWorkerConfig.disable();
    }
    await this.configRepository.saveAIWorkerConfig(aiWorkerConfig);
  }

  async setAIWorkerAutoStart(autoStart: boolean): Promise<void> {
    const aiWorkerConfig = await this.configRepository.loadAIWorkerConfig();
    aiWorkerConfig.setAutoStart(autoStart);
    await this.configRepository.saveAIWorkerConfig(aiWorkerConfig);
  }
}
