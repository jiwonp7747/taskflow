/**
 * Services Index
 *
 * 모든 서비스 초기화 및 정리
 */

import { getDatabase } from './database.service';
import { startWatching, stopWatching } from './fileWatcher.service';
import { cleanupWorker, startWorker, getWorkerStatus } from './aiWorker.service';

/**
 * Initialize all services
 */
export function initializeServices(): void {
  console.log('[Services] Initializing services...');

  // Start file watcher for active source if any
  initializeFileWatcher();

  // Auto-start AI worker if configured
  initializeAIWorker();

  console.log('[Services] Services initialized');
}

/**
 * Cleanup all services
 */
export function cleanupServices(): void {
  console.log('[Services] Cleaning up services...');

  // Stop file watcher
  stopWatching();

  // Cleanup AI worker
  cleanupWorker();

  console.log('[Services] Services cleaned up');
}

/**
 * Initialize file watcher for active source
 */
function initializeFileWatcher(): void {
  try {
    const db = getDatabase();

    const config = db
      .prepare('SELECT active_source_id FROM config WHERE id = 1')
      .get() as { active_source_id: string | null };

    if (!config?.active_source_id) {
      console.log('[Services] No active source, skipping file watcher');
      return;
    }

    const source = db
      .prepare('SELECT path FROM sources WHERE id = ?')
      .get(config.active_source_id) as { path: string } | undefined;

    if (source?.path) {
      console.log('[Services] Starting file watcher for active source:', source.path);
      startWatching(source.path);
    }
  } catch (error) {
    console.error('[Services] Failed to initialize file watcher:', error);
  }
}

/**
 * Initialize AI worker if auto-start is enabled
 */
function initializeAIWorker(): void {
  try {
    const db = getDatabase();

    const aiConfig = db
      .prepare('SELECT enabled, auto_start FROM ai_worker_config WHERE id = 1')
      .get() as { enabled: number; auto_start: number };

    if (aiConfig.enabled === 1 && aiConfig.auto_start === 1) {
      console.log('[Services] Auto-starting AI worker...');
      startWorker().catch((error) => {
        console.error('[Services] Failed to auto-start AI worker:', error);
      });
    } else {
      console.log('[Services] AI worker auto-start disabled');
    }
  } catch (error) {
    console.error('[Services] Failed to initialize AI worker:', error);
  }
}

// Re-export services
export { getDatabase, closeDatabase, getDatabasePath } from './database.service';
export {
  fileWatcher,
  startWatching,
  stopWatching,
  isWatching,
  getWatchedDirectory,
} from './fileWatcher.service';
