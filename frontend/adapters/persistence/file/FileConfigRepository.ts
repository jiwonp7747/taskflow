/**
 * FileConfigRepository - 파일 기반 Config 저장소
 *
 * .taskflow.config.json 파일에 Config 데이터를 저장하는 구현체
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Config, ConfigProps } from '@/core/domain/entities/Config';
import {
  AIWorkerConfig,
  AIWorkerConfigProps,
  DEFAULT_AI_WORKER_CONFIG_VALUES,
} from '@/core/domain/entities/AIWorkerConfig';
import type { IConfigRepository } from '@/core/ports/out/IConfigRepository';

// 파일 전체 구조
interface FileConfig {
  sources: unknown[];
  activeSourceId: string | null;
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  aiWorker?: Partial<AIWorkerConfigProps>;
}

const DEFAULT_FILE_CONFIG: FileConfig = {
  sources: [],
  activeSourceId: null,
  theme: 'dark',
  sidebarCollapsed: false,
  aiWorker: DEFAULT_AI_WORKER_CONFIG_VALUES,
};

export class FileConfigRepository implements IConfigRepository {
  private configFilePath: string;

  constructor(configFilePath?: string) {
    this.configFilePath = configFilePath || path.join(process.cwd(), '.taskflow.config.json');
  }

  private async readConfigFile(): Promise<FileConfig> {
    try {
      const content = await fs.readFile(this.configFilePath, 'utf-8');
      return JSON.parse(content) as FileConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // 파일이 없으면 기본값으로 생성
        await this.writeConfigFile(DEFAULT_FILE_CONFIG);
        return DEFAULT_FILE_CONFIG;
      }
      throw error;
    }
  }

  private async writeConfigFile(config: FileConfig): Promise<void> {
    await fs.writeFile(this.configFilePath, JSON.stringify(config, null, 2), 'utf-8');
  }

  async loadConfig(): Promise<Config> {
    const fileConfig = await this.readConfigFile();

    const props: ConfigProps = {
      activeSourceId: fileConfig.activeSourceId,
      theme: fileConfig.theme,
      sidebarCollapsed: fileConfig.sidebarCollapsed,
    };

    return Config.fromPersistence(props);
  }

  async saveConfig(config: Config): Promise<void> {
    const fileConfig = await this.readConfigFile();

    // Config 필드만 업데이트 (sources, aiWorker는 유지)
    fileConfig.activeSourceId = config.activeSourceId;
    fileConfig.theme = config.theme;
    fileConfig.sidebarCollapsed = config.sidebarCollapsed;

    await this.writeConfigFile(fileConfig);
  }

  async loadAIWorkerConfig(): Promise<AIWorkerConfig> {
    const fileConfig = await this.readConfigFile();
    return AIWorkerConfig.fromPersistence(fileConfig.aiWorker || {});
  }

  async saveAIWorkerConfig(aiWorkerConfig: AIWorkerConfig): Promise<void> {
    const fileConfig = await this.readConfigFile();
    fileConfig.aiWorker = aiWorkerConfig.toPersistence();
    await this.writeConfigFile(fileConfig);
  }
}
