/**
 * Config IPC Handler
 *
 * 앱 설정 관리를 위한 IPC 핸들러
 */

import { ipcMain } from 'electron';
import type { AppConfig, SourceConfig } from '../../types/config';
import type { AIWorkerConfig } from '../../types/ai';
import { getDatabase } from '../services/database.service';

/**
 * Load full app config from database
 */
function loadConfig(): AppConfig {
  const db = getDatabase();

  // Get config row
  const configRow = db
    .prepare('SELECT active_source_id, theme, sidebar_collapsed FROM config WHERE id = 1')
    .get() as {
    active_source_id: string | null;
    theme: string;
    sidebar_collapsed: number;
  };

  // Get AI worker config
  const aiConfigRow = db
    .prepare(
      'SELECT enabled, auto_start, polling_interval, max_concurrent, timeout, working_directory FROM ai_worker_config WHERE id = 1'
    )
    .get() as {
    enabled: number;
    auto_start: number;
    polling_interval: number;
    max_concurrent: number;
    timeout: number;
    working_directory: string | null;
  };

  // Get all sources
  const sourceRows = db
    .prepare('SELECT id, name, path, is_active, created_at, last_accessed FROM sources ORDER BY created_at DESC')
    .all() as Array<{
    id: string;
    name: string;
    path: string;
    is_active: number;
    created_at: string;
    last_accessed: string | null;
  }>;

  const sources: SourceConfig[] = sourceRows.map((row) => ({
    id: row.id,
    name: row.name,
    path: row.path,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    lastAccessed: row.last_accessed || undefined,
  }));

  const aiWorker: AIWorkerConfig = {
    enabled: aiConfigRow.enabled === 1,
    autoStart: aiConfigRow.auto_start === 1,
    pollingInterval: aiConfigRow.polling_interval,
    maxConcurrent: aiConfigRow.max_concurrent,
    timeout: aiConfigRow.timeout,
    workingDirectory: aiConfigRow.working_directory || undefined,
  };

  return {
    sources,
    activeSourceId: configRow.active_source_id,
    theme: configRow.theme as 'dark' | 'light',
    sidebarCollapsed: configRow.sidebar_collapsed === 1,
    aiWorker,
  };
}

/**
 * Update config in database
 */
function updateConfig(updates: Partial<AppConfig>): AppConfig {
  const db = getDatabase();

  // Update main config
  if (
    updates.theme !== undefined ||
    updates.sidebarCollapsed !== undefined ||
    updates.activeSourceId !== undefined
  ) {
    const configUpdates: string[] = [];
    const values: unknown[] = [];

    if (updates.theme !== undefined) {
      configUpdates.push('theme = ?');
      values.push(updates.theme);
    }
    if (updates.sidebarCollapsed !== undefined) {
      configUpdates.push('sidebar_collapsed = ?');
      values.push(updates.sidebarCollapsed ? 1 : 0);
    }
    if (updates.activeSourceId !== undefined) {
      configUpdates.push('active_source_id = ?');
      values.push(updates.activeSourceId);

      // Update sources is_active flag
      db.prepare('UPDATE sources SET is_active = 0').run();
      if (updates.activeSourceId) {
        db.prepare('UPDATE sources SET is_active = 1 WHERE id = ?').run(
          updates.activeSourceId
        );
      }
    }

    if (configUpdates.length > 0) {
      db.prepare(`UPDATE config SET ${configUpdates.join(', ')} WHERE id = 1`).run(
        ...values
      );
    }
  }

  // Update AI worker config
  if (updates.aiWorker) {
    const aiUpdates: string[] = [];
    const aiValues: unknown[] = [];

    if (updates.aiWorker.enabled !== undefined) {
      aiUpdates.push('enabled = ?');
      aiValues.push(updates.aiWorker.enabled ? 1 : 0);
    }
    if (updates.aiWorker.autoStart !== undefined) {
      aiUpdates.push('auto_start = ?');
      aiValues.push(updates.aiWorker.autoStart ? 1 : 0);
    }
    if (updates.aiWorker.pollingInterval !== undefined) {
      aiUpdates.push('polling_interval = ?');
      aiValues.push(updates.aiWorker.pollingInterval);
    }
    if (updates.aiWorker.maxConcurrent !== undefined) {
      aiUpdates.push('max_concurrent = ?');
      aiValues.push(updates.aiWorker.maxConcurrent);
    }
    if (updates.aiWorker.timeout !== undefined) {
      aiUpdates.push('timeout = ?');
      aiValues.push(updates.aiWorker.timeout);
    }
    if (updates.aiWorker.workingDirectory !== undefined) {
      aiUpdates.push('working_directory = ?');
      aiValues.push(updates.aiWorker.workingDirectory || null);
    }

    if (aiUpdates.length > 0) {
      db.prepare(
        `UPDATE ai_worker_config SET ${aiUpdates.join(', ')} WHERE id = 1`
      ).run(...aiValues);
    }
  }

  return loadConfig();
}

/**
 * Register Config IPC handlers
 */
export function registerConfigIPC(): void {
  // Get config
  ipcMain.handle('config:get', async (): Promise<AppConfig> => {
    try {
      return loadConfig();
    } catch (error) {
      console.error('[ConfigIPC] Failed to get config:', error);
      throw error;
    }
  });

  // Update config
  ipcMain.handle(
    'config:update',
    async (_event, updates: Partial<AppConfig>): Promise<AppConfig> => {
      try {
        const config = updateConfig(updates);
        console.log('[ConfigIPC] Config updated');
        return config;
      } catch (error) {
        console.error('[ConfigIPC] Failed to update config:', error);
        throw error;
      }
    }
  );

  console.log('[ConfigIPC] Handlers registered');
}
