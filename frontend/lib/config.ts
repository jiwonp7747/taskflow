/**
 * lib/config.ts - Legacy configuration access layer
 *
 * Provides direct access to configuration for legacy lib files that don't use DI.
 * This is a compatibility layer - new code should use the DI container instead.
 */

import path from 'path';
import { getFileConfigStore } from '@/adapters/persistence/file/FileConfigStore';
import type { AIWorkerConfigProps } from '@/core/domain/entities/AIWorkerConfig';
import { DEFAULT_AI_WORKER_CONFIG_VALUES } from '@/core/domain/entities/AIWorkerConfig';

/**
 * Get AI Worker configuration from file
 * Returns the raw config props (not the entity)
 */
export async function getAIWorkerConfig(): Promise<AIWorkerConfigProps> {
  const store = getFileConfigStore();
  const fileConfig = await store.read();

  // Merge with defaults to ensure all required fields are present
  return {
    ...DEFAULT_AI_WORKER_CONFIG_VALUES,
    ...(fileConfig.aiWorker || {}),
  } as AIWorkerConfigProps;
}

/**
 * Get the active source's tasks directory path
 * Returns the path to the currently active source, or default if none
 */
export async function getActiveTasksDirectory(): Promise<string> {
  const store = getFileConfigStore();
  const fileConfig = await store.read();

  // Find the active source
  if (fileConfig.activeSourceId) {
    const activeSource = fileConfig.sources.find(
      s => s.id === fileConfig.activeSourceId
    );

    if (activeSource) {
      return activeSource.path;
    }
  }

  // Fallback to default tasks directory
  return path.join(process.cwd(), 'tasks');
}
