/**
 * SQLite Config Repository
 *
 * IConfigRepository의 SQLite 구현체
 */

import type { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import { Config, type ThemeType } from '@/core/domain/entities/Config';
import { AIWorkerConfig } from '@/core/domain/entities/AIWorkerConfig';
import { getDatabase } from './database';
import type Database from 'better-sqlite3';

interface ConfigRow {
  id: number;
  active_source_id: string | null;
  theme: string;
  sidebar_collapsed: number;
}

interface AIWorkerConfigRow {
  id: number;
  enabled: number;
  auto_start: number;
  polling_interval: number;
  max_concurrent: number;
  timeout: number;
  working_directory: string | null;
}

export class SqliteConfigRepository implements IConfigRepository {
  private db: Database.Database;

  constructor(dbPath?: string) {
    this.db = getDatabase(dbPath);
  }

  async loadConfig(): Promise<Config> {
    const stmt = this.db.prepare(`
      SELECT id, active_source_id, theme, sidebar_collapsed
      FROM config
      WHERE id = 1
    `);

    const row = stmt.get() as ConfigRow | undefined;

    if (!row) {
      return Config.create();
    }

    return Config.fromPersistence({
      activeSourceId: row.active_source_id,
      theme: row.theme as ThemeType,
      sidebarCollapsed: row.sidebar_collapsed === 1,
    });
  }

  async saveConfig(config: Config): Promise<void> {
    const json = config.toJSON();

    const stmt = this.db.prepare(`
      UPDATE config
      SET active_source_id = @active_source_id,
          theme = @theme,
          sidebar_collapsed = @sidebar_collapsed
      WHERE id = 1
    `);

    stmt.run({
      active_source_id: json.activeSourceId,
      theme: json.theme,
      sidebar_collapsed: json.sidebarCollapsed ? 1 : 0,
    });
  }

  async loadAIWorkerConfig(): Promise<AIWorkerConfig> {
    const stmt = this.db.prepare(`
      SELECT id, enabled, auto_start, polling_interval, max_concurrent, timeout, working_directory
      FROM ai_worker_config
      WHERE id = 1
    `);

    const row = stmt.get() as AIWorkerConfigRow | undefined;

    if (!row) {
      return AIWorkerConfig.create();
    }

    return AIWorkerConfig.fromPersistence({
      enabled: row.enabled === 1,
      autoStart: row.auto_start === 1,
      pollingInterval: row.polling_interval,
      maxConcurrent: row.max_concurrent,
      timeout: row.timeout,
      workingDirectory: row.working_directory ?? undefined,
    });
  }

  async saveAIWorkerConfig(config: AIWorkerConfig): Promise<void> {
    const json = config.toJSON();

    const stmt = this.db.prepare(`
      UPDATE ai_worker_config
      SET enabled = @enabled,
          auto_start = @auto_start,
          polling_interval = @polling_interval,
          max_concurrent = @max_concurrent,
          timeout = @timeout,
          working_directory = @working_directory
      WHERE id = 1
    `);

    stmt.run({
      enabled: json.enabled ? 1 : 0,
      auto_start: json.autoStart ? 1 : 0,
      polling_interval: json.pollingInterval,
      max_concurrent: json.maxConcurrent,
      timeout: json.timeout,
      working_directory: json.workingDirectory ?? null,
    });
  }
}
