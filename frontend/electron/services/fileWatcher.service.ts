/**
 * File Watcher Service for Electron Main Process
 *
 * 태스크 파일 변경 감지 및 렌더러 프로세스에 이벤트 전파
 */

import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { BrowserWindow } from 'electron';
import type { FileWatchEvent } from '../../types/task';

/**
 * Debounce utility
 */
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Extract task ID from file path
 */
function extractTaskId(filePath: string): string {
  return path.basename(filePath, '.md');
}

/**
 * Send event to all renderer windows
 */
function sendToAllWindows(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data);
    }
  });
}

/**
 * File Watcher Service (Singleton)
 */
class FileWatcherService {
  private static instance: FileWatcherService;
  private watcher: FSWatcher | null = null;
  private isWatching = false;
  private watchedDirectory: string | null = null;

  private constructor() {}

  static getInstance(): FileWatcherService {
    if (!FileWatcherService.instance) {
      FileWatcherService.instance = new FileWatcherService();
    }
    return FileWatcherService.instance;
  }

  /**
   * Start watching a directory
   */
  start(directory: string): void {
    if (this.isWatching && this.watchedDirectory === directory) {
      console.log('[FileWatcher] Already watching:', directory);
      return;
    }

    // Stop existing watcher if different directory
    if (this.watcher) {
      this.stop();
    }

    this.watchedDirectory = directory;
    console.log('[FileWatcher] Starting file watcher for:', directory);

    this.watcher = chokidar.watch(path.join(directory, '*.md'), {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Create debounced broadcast function
    const debouncedBroadcast = debounce(
      (type: 'add' | 'change' | 'unlink', filePath: string) => {
        const taskId = extractTaskId(filePath);
        console.log(`[FileWatcher] File event: ${type} - ${taskId}`);

        const event: FileWatchEvent = {
          type,
          taskId,
          path: filePath,
          timestamp: Date.now(),
        };

        // Send to all renderer windows
        sendToAllWindows('file:changed', event);
      },
      100
    );

    this.watcher
      .on('add', (filePath) => debouncedBroadcast('add', filePath))
      .on('change', (filePath) => debouncedBroadcast('change', filePath))
      .on('unlink', (filePath) => debouncedBroadcast('unlink', filePath))
      .on('error', (error) => {
        console.error('[FileWatcher] Error:', error);
      });

    this.isWatching = true;
    console.log('[FileWatcher] File watcher started successfully');
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher) {
      console.log('[FileWatcher] Stopping file watcher');
      this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
    this.watchedDirectory = null;
  }

  /**
   * Check if currently watching
   */
  get isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Get the current watched directory
   */
  get directory(): string | null {
    return this.watchedDirectory;
  }
}

// Export singleton instance
export const fileWatcher = FileWatcherService.getInstance();

// Export convenience functions
export function startWatching(directory: string): void {
  fileWatcher.start(directory);
}

export function stopWatching(): void {
  fileWatcher.stop();
}

export function isWatching(): boolean {
  return fileWatcher.isActive;
}

export function getWatchedDirectory(): string | null {
  return fileWatcher.directory;
}
