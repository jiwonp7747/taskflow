/**
 * FileConfigStore - Shared file-based configuration storage
 *
 * Provides centralized access to .taskflow.config.json with atomic writes
 * to prevent race conditions between FileConfigRepository and FileSourceRepository.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { DEFAULT_AI_WORKER_CONFIG_VALUES, type AIWorkerConfigProps } from '@/core/domain/entities/AIWorkerConfig';

/**
 * Persisted source data structure (Date fields stored as ISO strings)
 */
export interface PersistedSource {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  createdAt: string;
  lastAccessed?: string;
}

/**
 * Complete configuration file structure
 */
export interface FileConfig {
  sources: PersistedSource[];
  activeSourceId: string | null;
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  aiWorker?: AIWorkerConfigProps;
}

/**
 * Default configuration values
 */
export const DEFAULT_FILE_CONFIG: FileConfig = {
  sources: [],
  activeSourceId: null,
  theme: 'dark',
  sidebarCollapsed: false,
  aiWorker: DEFAULT_AI_WORKER_CONFIG_VALUES,
};

/**
 * Centralized file configuration store with atomic write support
 */
export class FileConfigStore {
  private configFilePath: string;

  constructor(configFilePath?: string) {
    this.configFilePath = configFilePath || path.join(process.cwd(), '.taskflow.config.json');
  }

  /**
   * Reads the configuration file
   * Creates a default config file if it doesn't exist
   *
   * @returns The parsed configuration object
   * @throws Error if file read fails for reasons other than ENOENT
   */
  async read(): Promise<FileConfig> {
    try {
      const content = await fs.readFile(this.configFilePath, 'utf-8');
      return JSON.parse(content) as FileConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, create default config
        await this.write(DEFAULT_FILE_CONFIG);
        return DEFAULT_FILE_CONFIG;
      }
      throw error;
    }
  }

  /**
   * Writes the configuration file atomically
   * Uses temp file + rename pattern to prevent corruption on concurrent writes
   *
   * @param config - The configuration object to write
   * @throws Error if file write fails
   */
  async write(config: FileConfig): Promise<void> {
    const tempFilePath = `${this.configFilePath}.tmp`;
    const content = JSON.stringify(config, null, 2);

    try {
      // Write to temporary file first
      await fs.writeFile(tempFilePath, content, 'utf-8');

      // Atomic rename (overwrites destination on most platforms)
      await fs.rename(tempFilePath, this.configFilePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Updates the configuration file with a transformation function
   * Ensures read-modify-write atomicity
   *
   * @param transformer - Function that receives current config and returns updated config
   * @throws Error if read or write fails
   */
  async update(transformer: (config: FileConfig) => FileConfig): Promise<void> {
    const config = await this.read();
    const updatedConfig = transformer(config);
    await this.write(updatedConfig);
  }
}

/**
 * Singleton instance for shared access across repositories
 */
let singletonInstance: FileConfigStore | null = null;

/**
 * Gets or creates the singleton FileConfigStore instance
 *
 * @param configFilePath - Optional custom path (only used on first call)
 * @returns The singleton FileConfigStore instance
 */
export function getFileConfigStore(configFilePath?: string): FileConfigStore {
  if (!singletonInstance) {
    singletonInstance = new FileConfigStore(configFilePath);
  }
  return singletonInstance;
}

/**
 * Resets the singleton instance (mainly for testing)
 */
export function resetFileConfigStore(): void {
  singletonInstance = null;
}
