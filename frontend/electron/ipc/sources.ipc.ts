/**
 * Sources IPC Handler
 *
 * 태스크 소스(디렉토리) 관리를 위한 IPC 핸들러
 */

import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import type { SourceConfig, UpdateSourceRequest } from '../../types/config';
import { getDatabase } from '../services/database.service';
import { ensureDirectory, directoryExists } from '../lib/fileSystem';
import { startWatching, stopWatching } from '../services/fileWatcher.service';

/**
 * Convert database row to SourceConfig
 */
function rowToSourceConfig(row: {
  id: string;
  name: string;
  path: string;
  is_active: number;
  created_at: string;
  last_accessed: string | null;
}): SourceConfig {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    lastAccessed: row.last_accessed || undefined,
  };
}

/**
 * Get all sources from database
 */
function getAllSources(): SourceConfig[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      'SELECT id, name, path, is_active, created_at, last_accessed FROM sources ORDER BY created_at DESC'
    )
    .all() as Array<{
    id: string;
    name: string;
    path: string;
    is_active: number;
    created_at: string;
    last_accessed: string | null;
  }>;

  return rows.map(rowToSourceConfig);
}

/**
 * Add new source
 */
async function addSource(data: {
  path: string;
  name: string;
}): Promise<SourceConfig> {
  const db = getDatabase();

  // Validate path
  const exists = await directoryExists(data.path);
  if (!exists) {
    // Create directory if it doesn't exist
    await ensureDirectory(data.path);
  }

  // Check if source with same path already exists
  const existing = db
    .prepare('SELECT id FROM sources WHERE path = ?')
    .get(data.path);

  if (existing) {
    throw new Error(`Source with path "${data.path}" already exists`);
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO sources (id, name, path, is_active, created_at, last_accessed)
     VALUES (?, ?, ?, 0, ?, ?)`
  ).run(id, data.name, data.path, now, now);

  const row = db
    .prepare(
      'SELECT id, name, path, is_active, created_at, last_accessed FROM sources WHERE id = ?'
    )
    .get(id) as {
    id: string;
    name: string;
    path: string;
    is_active: number;
    created_at: string;
    last_accessed: string | null;
  };

  console.log('[SourcesIPC] Source added:', id, data.name);
  return rowToSourceConfig(row);
}

/**
 * Update source
 */
function updateSource(
  id: string,
  updates: UpdateSourceRequest
): SourceConfig {
  const db = getDatabase();

  const existing = db
    .prepare('SELECT id FROM sources WHERE id = ?')
    .get(id);

  if (!existing) {
    throw new Error(`Source with ID "${id}" not found`);
  }

  const updateParts: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    updateParts.push('name = ?');
    values.push(updates.name);
  }
  if (updates.path !== undefined) {
    updateParts.push('path = ?');
    values.push(updates.path);
  }

  if (updateParts.length > 0) {
    values.push(id);
    db.prepare(
      `UPDATE sources SET ${updateParts.join(', ')} WHERE id = ?`
    ).run(...values);
  }

  const row = db
    .prepare(
      'SELECT id, name, path, is_active, created_at, last_accessed FROM sources WHERE id = ?'
    )
    .get(id) as {
    id: string;
    name: string;
    path: string;
    is_active: number;
    created_at: string;
    last_accessed: string | null;
  };

  console.log('[SourcesIPC] Source updated:', id);
  return rowToSourceConfig(row);
}

/**
 * Delete source
 */
function deleteSource(id: string): void {
  const db = getDatabase();

  const existing = db
    .prepare('SELECT id FROM sources WHERE id = ?')
    .get(id);

  if (!existing) {
    throw new Error(`Source with ID "${id}" not found`);
  }

  // If this is the active source, clear it from config and stop watcher
  const config = db
    .prepare('SELECT active_source_id FROM config WHERE id = 1')
    .get() as { active_source_id: string | null };

  if (config?.active_source_id === id) {
    db.prepare('UPDATE config SET active_source_id = NULL WHERE id = 1').run();
    stopWatching();
  }

  db.prepare('DELETE FROM sources WHERE id = ?').run(id);
  console.log('[SourcesIPC] Source deleted:', id);
}

/**
 * Set active source
 */
function setActiveSource(id: string): void {
  const db = getDatabase();

  const existing = db
    .prepare('SELECT id, path FROM sources WHERE id = ?')
    .get(id) as { id: string; path: string } | undefined;

  if (!existing) {
    throw new Error(`Source with ID "${id}" not found`);
  }

  // Update all sources to inactive
  db.prepare('UPDATE sources SET is_active = 0').run();

  // Set this source as active
  db.prepare('UPDATE sources SET is_active = 1, last_accessed = ? WHERE id = ?').run(
    new Date().toISOString(),
    id
  );

  // Update config
  db.prepare('UPDATE config SET active_source_id = ? WHERE id = 1').run(id);

  // Start file watcher for the new active source
  startWatching(existing.path);

  console.log('[SourcesIPC] Active source set:', id);
}

/**
 * Register Sources IPC handlers
 */
export function registerSourcesIPC(): void {
  // Get all sources
  ipcMain.handle('sources:getAll', async (): Promise<SourceConfig[]> => {
    try {
      return getAllSources();
    } catch (error) {
      console.error('[SourcesIPC] Failed to get sources:', error);
      throw error;
    }
  });

  // Add source
  ipcMain.handle(
    'sources:add',
    async (
      _event,
      data: { path: string; name: string }
    ): Promise<SourceConfig> => {
      try {
        return await addSource(data);
      } catch (error) {
        console.error('[SourcesIPC] Failed to add source:', error);
        throw error;
      }
    }
  );

  // Update source
  ipcMain.handle(
    'sources:update',
    async (
      _event,
      { id, data }: { id: string; data: UpdateSourceRequest }
    ): Promise<SourceConfig> => {
      try {
        return updateSource(id, data);
      } catch (error) {
        console.error(`[SourcesIPC] Failed to update source ${id}:`, error);
        throw error;
      }
    }
  );

  // Delete source
  ipcMain.handle(
    'sources:delete',
    async (_event, { id }: { id: string }): Promise<void> => {
      try {
        deleteSource(id);
      } catch (error) {
        console.error(`[SourcesIPC] Failed to delete source ${id}:`, error);
        throw error;
      }
    }
  );

  // Set active source
  ipcMain.handle(
    'sources:setActive',
    async (_event, { id }: { id: string }): Promise<void> => {
      try {
        setActiveSource(id);
      } catch (error) {
        console.error(`[SourcesIPC] Failed to set active source ${id}:`, error);
        throw error;
      }
    }
  );

  console.log('[SourcesIPC] Handlers registered');
}
