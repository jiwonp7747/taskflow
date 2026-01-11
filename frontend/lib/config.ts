import { promises as fs } from 'fs';
import path from 'path';
import type { AppConfig, SourceConfig, SourceValidationResult } from '@/types/config';
import { DEFAULT_CONFIG } from '@/types/config';
import type { AIWorkerConfig } from '@/types/ai';
import { DEFAULT_AI_WORKER_CONFIG } from '@/types/ai';

// Config file location
const CONFIG_FILE = path.join(process.cwd(), '.taskflow.config.json');

// Load configuration from file (always reads fresh from disk)
export async function loadConfig(): Promise<AppConfig> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content) as AppConfig;
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Create default config if not exists
      await saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}

// Save configuration to file
export async function saveConfig(config: AppConfig): Promise<void> {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// Get the active tasks directory path (always reads fresh from config)
export async function getActiveTasksDirectory(): Promise<string> {
  try {
    const config = await loadConfig();

    if (config.activeSourceId) {
      const activeSource = config.sources.find(s => s.id === config.activeSourceId);
      if (activeSource) {
        return activeSource.path;
      }
    }

    // Fallback to default tasks directory
    return path.join(process.cwd(), 'tasks');
  } catch {
    return path.join(process.cwd(), 'tasks');
  }
}

// Validate a source path
export async function validateSourcePath(sourcePath: string): Promise<SourceValidationResult> {
  const result: SourceValidationResult = {
    valid: false,
    path: sourcePath,
    exists: false,
    isDirectory: false,
    taskCount: 0,
  };

  try {
    // Check if path exists
    const stats = await fs.stat(sourcePath);
    result.exists = true;
    result.isDirectory = stats.isDirectory();

    if (!result.isDirectory) {
      result.error = 'Path is not a directory';
      return result;
    }

    // Count markdown files
    const files = await fs.readdir(sourcePath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    result.taskCount = mdFiles.length;
    result.valid = true;

    return result;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      result.error = 'Directory does not exist';
    } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      result.error = 'Permission denied';
    } else {
      result.error = String(error);
    }
    return result;
  }
}

// Add a new source
export async function addSource(name: string, sourcePath: string): Promise<SourceConfig> {
  const config = await loadConfig();

  // Check for duplicate paths
  const existing = config.sources.find(s => s.path === sourcePath);
  if (existing) {
    throw new Error('Source with this path already exists');
  }

  const newSource: SourceConfig = {
    id: `source-${Date.now()}`,
    name,
    path: sourcePath,
    isActive: config.sources.length === 0, // First source is active by default
    createdAt: new Date().toISOString(),
  };

  config.sources.push(newSource);

  // Set as active if it's the first source
  if (newSource.isActive) {
    config.activeSourceId = newSource.id;
  }

  await saveConfig(config);
  return newSource;
}

// Update a source
export async function updateSource(id: string, updates: Partial<SourceConfig>): Promise<SourceConfig> {
  const config = await loadConfig();

  const index = config.sources.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error('Source not found');
  }

  // Update the source
  config.sources[index] = {
    ...config.sources[index],
    ...updates,
    id, // Preserve ID
    createdAt: config.sources[index].createdAt, // Preserve creation date
  };

  await saveConfig(config);
  return config.sources[index];
}

// Delete a source
export async function deleteSource(id: string): Promise<void> {
  const config = await loadConfig();

  const index = config.sources.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error('Source not found');
  }

  config.sources.splice(index, 1);

  // If deleted source was active, set first remaining source as active
  if (config.activeSourceId === id) {
    config.activeSourceId = config.sources[0]?.id || null;
  }

  await saveConfig(config);
}

// Set active source
export async function setActiveSource(id: string): Promise<void> {
  const config = await loadConfig();

  const source = config.sources.find(s => s.id === id);
  if (!source) {
    throw new Error('Source not found');
  }

  // Update active status
  config.sources.forEach(s => {
    s.isActive = s.id === id;
  });
  config.activeSourceId = id;

  // Update last accessed
  source.lastAccessed = new Date().toISOString();

  await saveConfig(config);
}

// Get active source
export async function getActiveSource(): Promise<SourceConfig | null> {
  const config = await loadConfig();

  if (!config.activeSourceId) {
    return null;
  }

  return config.sources.find(s => s.id === config.activeSourceId) || null;
}

// Create directory if it doesn't exist
export async function createSourceDirectory(sourcePath: string): Promise<void> {
  await fs.mkdir(sourcePath, { recursive: true });
}

// ============================================
// AI Worker Configuration Functions
// ============================================

// Get AI Worker config (with defaults for missing fields)
export async function getAIWorkerConfig(): Promise<AIWorkerConfig> {
  const config = await loadConfig();
  return {
    ...DEFAULT_AI_WORKER_CONFIG,
    ...config.aiWorker,
  };
}

// Update AI Worker config
export async function updateAIWorkerConfig(updates: Partial<AIWorkerConfig>): Promise<AIWorkerConfig> {
  const config = await loadConfig();

  config.aiWorker = {
    ...DEFAULT_AI_WORKER_CONFIG,
    ...config.aiWorker,
    ...updates,
  };

  await saveConfig(config);
  return config.aiWorker;
}

// Enable/Disable AI Worker
export async function setAIWorkerEnabled(enabled: boolean): Promise<void> {
  await updateAIWorkerConfig({ enabled });
}

// Set AI Worker auto-start
export async function setAIWorkerAutoStart(autoStart: boolean): Promise<void> {
  await updateAIWorkerConfig({ autoStart });
}
