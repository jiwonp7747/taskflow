/**
 * Tasks IPC Handler
 *
 * 태스크 CRUD 작업을 위한 IPC 핸들러
 */

import { ipcMain } from 'electron';
import { Octokit } from '@octokit/rest';
import type { Task, TaskCreateRequest, TaskUpdateRequest } from '../../types/task';
import { getDatabase } from '../services/database.service';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../lib/fileSystem';
import { parseTaskContent } from '../lib/taskParser';
import { safeLog, safeError } from '../lib/safeConsole';

interface GitHubSourceInfo {
  isGitHub: true;
  owner: string;
  repo: string;
  branch: string;
  rootPath: string;
  token: string;
}

interface LocalSourceInfo {
  isGitHub: false;
  path: string;
}

// Cache for GitHub file contents (SHA -> content)
interface GitHubCacheEntry {
  sha: string;
  content: string;
  task: Task;
  fetchedAt: number;
}

const githubCache = new Map<string, GitHubCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get active source info from database
 */
function getActiveSourceInfo(): GitHubSourceInfo | LocalSourceInfo | null {
  const db = getDatabase();

  const config = db
    .prepare('SELECT active_source_id FROM config WHERE id = 1')
    .get() as { active_source_id: string | null } | undefined;

  if (!config?.active_source_id) {
    return null;
  }

  const source = db
    .prepare('SELECT path, source_type, github_config FROM sources WHERE id = ?')
    .get(config.active_source_id) as {
      path: string;
      source_type?: string;
      github_config?: string;
    } | undefined;

  if (!source) {
    return null;
  }

  // Check if it's a GitHub source
  if (source.source_type === 'github' && source.github_config) {
    try {
      const githubConfig = JSON.parse(source.github_config);
      return {
        isGitHub: true,
        owner: githubConfig.owner,
        repo: githubConfig.repo,
        branch: githubConfig.branch,
        rootPath: githubConfig.rootPath,
        token: githubConfig.token,
      };
    } catch {
      safeError('[TasksIPC] Failed to parse GitHub config');
    }
  }

  return {
    isGitHub: false,
    path: source.path,
  };
}

/**
 * Fetch tasks from GitHub repository with caching and parallel requests
 */
async function getGitHubTasks(source: GitHubSourceInfo): Promise<Task[]> {
  const octokit = new Octokit({ auth: source.token });
  const tasks: Task[] = [];
  const now = Date.now();

  try {
    // Get tree recursively
    const { data: ref } = await octokit.git.getRef({
      owner: source.owner,
      repo: source.repo,
      ref: `heads/${source.branch}`,
    });

    const { data: tree } = await octokit.git.getTree({
      owner: source.owner,
      repo: source.repo,
      tree_sha: ref.object.sha,
      recursive: 'true',
    });

    const rootPathPrefix = source.rootPath === '/' ? '' : source.rootPath.replace(/^\//, '');

    // Filter markdown files in root path
    const mdFiles = tree.tree.filter(item =>
      item.type === 'blob' &&
      item.path?.endsWith('.md') &&
      (rootPathPrefix === '' || item.path.startsWith(rootPathPrefix + '/'))
    );

    safeLog(`[TasksIPC] Found ${mdFiles.length} markdown files in GitHub`);

    // Separate cached vs uncached files
    const uncachedFiles: typeof mdFiles = [];

    for (const file of mdFiles) {
      if (!file.path || !file.sha) continue;

      const cacheKey = `${source.owner}/${source.repo}/${file.path}`;
      const cached = githubCache.get(cacheKey);

      // Use cache if SHA matches and not expired
      if (cached && cached.sha === file.sha && (now - cached.fetchedAt) < CACHE_TTL) {
        tasks.push(cached.task);
      } else {
        uncachedFiles.push(file);
      }
    }

    safeLog(`[TasksIPC] Cache hit: ${tasks.length}, fetching: ${uncachedFiles.length}`);

    // Fetch uncached files in parallel batches (10 at a time to avoid rate limits)
    const BATCH_SIZE = 10;
    for (let i = 0; i < uncachedFiles.length; i += BATCH_SIZE) {
      const batch = uncachedFiles.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (file) => {
          if (!file.path || !file.sha) return null;

          try {
            const { data } = await octokit.git.getBlob({
              owner: source.owner,
              repo: source.repo,
              file_sha: file.sha,
            });

            // Decode base64 content
            const content = Buffer.from(data.content, 'base64').toString('utf-8');

            // Generate relative path for task
            const relativePath = rootPathPrefix
              ? file.path.replace(rootPathPrefix + '/', '')
              : file.path;

            // Parse task content
            const task = parseTaskContent(content, relativePath);

            // Cache the result
            const cacheKey = `${source.owner}/${source.repo}/${file.path}`;
            githubCache.set(cacheKey, {
              sha: file.sha,
              content,
              task,
              fetchedAt: now,
            });

            return task;
          } catch (fileError) {
            safeError(`[TasksIPC] Failed to fetch file ${file.path}:`, fileError);
            return null;
          }
        })
      );

      // Add successful results
      for (const task of batchResults) {
        if (task) tasks.push(task);
      }
    }

    return tasks;
  } catch (error) {
    safeError('[TasksIPC] Failed to fetch GitHub tasks:', error);
    throw error;
  }
}

/**
 * Ensure active source exists
 */
function requireActiveSource(): GitHubSourceInfo | LocalSourceInfo {
  const source = getActiveSourceInfo();
  if (!source) {
    throw new Error('No active source selected. Please select a task source first.');
  }
  return source;
}

/**
 * Register Tasks IPC handlers
 */
export function registerTasksIPC(): void {
  // Get all tasks
  ipcMain.handle('tasks:getAll', async (): Promise<Task[]> => {
    const source = getActiveSourceInfo();
    if (!source) {
      return [];
    }

    try {
      if (source.isGitHub) {
        return await getGitHubTasks(source);
      } else {
        return await getAllTasks(source.path);
      }
    } catch (error) {
      safeError('[TasksIPC] Failed to get all tasks:', error);
      throw error;
    }
  });

  // Get task by ID
  ipcMain.handle(
    'tasks:getById',
    async (_event, { id }: { id: string }): Promise<Task | null> => {
      const source = requireActiveSource();

      try {
        if (source.isGitHub) {
          // Check cache first
          for (const [, entry] of githubCache) {
            if (entry.task.id === id) {
              return entry.task;
            }
          }
          // If not in cache, fetch all (will populate cache)
          const tasks = await getGitHubTasks(source);
          return tasks.find(t => t.id === id) || null;
        } else {
          return await getTaskById(id, source.path);
        }
      } catch (error) {
        safeError(`[TasksIPC] Failed to get task ${id}:`, error);
        throw error;
      }
    }
  );

  // Create new task
  ipcMain.handle(
    'tasks:create',
    async (_event, data: TaskCreateRequest): Promise<Task> => {
      const source = requireActiveSource();

      if (source.isGitHub) {
        throw new Error('Creating tasks in GitHub sources is not yet supported. Use sync to push local changes.');
      }

      try {
        const task = await createTask(data, source.path);
        safeLog('[TasksIPC] Task created:', task.id);
        return task;
      } catch (error) {
        safeError('[TasksIPC] Failed to create task:', error);
        throw error;
      }
    }
  );

  // Update task
  ipcMain.handle(
    'tasks:update',
    async (
      _event,
      { id, data }: { id: string; data: TaskUpdateRequest }
    ): Promise<Task> => {
      const source = requireActiveSource();

      if (source.isGitHub) {
        throw new Error('Updating tasks in GitHub sources is not yet supported. Use sync to push local changes.');
      }

      try {
        const task = await updateTask(id, data, source.path);
        safeLog('[TasksIPC] Task updated:', task.id);
        return task;
      } catch (error) {
        safeError(`[TasksIPC] Failed to update task ${id}:`, error);
        throw error;
      }
    }
  );

  // Delete task
  ipcMain.handle(
    'tasks:delete',
    async (_event, { id }: { id: string }): Promise<void> => {
      const source = requireActiveSource();

      if (source.isGitHub) {
        throw new Error('Deleting tasks in GitHub sources is not yet supported. Use sync to push local changes.');
      }

      try {
        await deleteTask(id, source.path);
        safeLog('[TasksIPC] Task deleted:', id);
      } catch (error) {
        safeError(`[TasksIPC] Failed to delete task ${id}:`, error);
        throw error;
      }
    }
  );

  safeLog('[TasksIPC] Handlers registered');
}
