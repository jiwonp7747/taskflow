import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import type { FileWatchEvent } from '@/types/task';

type FileEventCallback = (event: FileWatchEvent) => void;

// Debounce utility
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

// Extract task ID from file path
function extractTaskId(filePath: string): string {
  return path.basename(filePath, '.md');
}

// Singleton file watcher instance
class FileWatcherService {
  private static instance: FileWatcherService;
  private watcher: FSWatcher | null = null;
  private subscribers: Set<FileEventCallback> = new Set();
  private isWatching = false;
  private watchedDirectory: string | null = null;

  private constructor() {}

  static getInstance(): FileWatcherService {
    if (!FileWatcherService.instance) {
      FileWatcherService.instance = new FileWatcherService();
    }
    return FileWatcherService.instance;
  }

  // Start watching a directory
  start(directory: string): void {
    if (this.isWatching && this.watchedDirectory === directory) {
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
        this.broadcast(event);
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

  // Stop watching
  stop(): void {
    if (this.watcher) {
      console.log('[FileWatcher] Stopping file watcher');
      this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
    this.watchedDirectory = null;
  }

  // Subscribe to file events
  subscribe(callback: FileEventCallback): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Broadcast event to all subscribers
  private broadcast(event: FileWatchEvent): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('[FileWatcher] Error in subscriber callback:', error);
      }
    });
  }

  // Check if currently watching
  get isActive(): boolean {
    return this.isWatching;
  }

  // Get the current watched directory
  get directory(): string | null {
    return this.watchedDirectory;
  }
}

// Export singleton instance
export const fileWatcher = FileWatcherService.getInstance();

// Export for direct usage
export function startWatching(directory: string): void {
  fileWatcher.start(directory);
}

export function stopWatching(): void {
  fileWatcher.stop();
}

export function subscribeToChanges(callback: FileEventCallback): () => void {
  return fileWatcher.subscribe(callback);
}
