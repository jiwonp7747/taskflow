// Application Configuration Types

import type { AIWorkerConfig } from './ai';
import { DEFAULT_AI_WORKER_CONFIG } from './ai';

export type SourceType = 'local' | 'github';

export interface GitHubSourceConfigType {
  owner: string;
  repo: string;
  branch: string;
  rootPath: string;
  // token is never exposed to client
}

export interface SourceConfig {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  createdAt: string;
  lastAccessed?: string;
  sourceType?: SourceType;           // Optional for backward compat
  githubConfig?: GitHubSourceConfigType;  // Only for github sources
  lastSynced?: string;               // Only for github sources
}

export interface AppConfig {
  sources: SourceConfig[];
  activeSourceId: string | null;
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  aiWorker: AIWorkerConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  sources: [],
  activeSourceId: null,
  theme: 'dark',
  sidebarCollapsed: false,
  aiWorker: DEFAULT_AI_WORKER_CONFIG,
};

// API Types
export interface ConfigResponse {
  config: AppConfig;
}

export interface SourceValidationResult {
  valid: boolean;
  path: string;
  exists: boolean;
  isDirectory: boolean;
  taskCount: number;
  error?: string;
}

export interface AddSourceRequest {
  name: string;
  path: string;
  createIfNotExist?: boolean;
}

export interface UpdateSourceRequest {
  name?: string;
  path?: string;
  isActive?: boolean;
}
