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
import { parseTaskContent, generateTaskContent, updateTaskFrontmatter } from '../lib/taskParser';
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
 * Get file SHA from cache or fetch from GitHub if not found
 */
async function getGitHubFileSha(
  source: GitHubSourceInfo,
  taskId: string
): Promise<{ sha: string; content: string; filePath: string } | null> {
  // First check cache
  for (const [cacheKey, entry] of githubCache) {
    if (entry.task.id === taskId) {
      const filePath = cacheKey.split('/').slice(2).join('/'); // Remove owner/repo prefix
      return { sha: entry.sha, content: entry.content, filePath };
    }
  }

  // If not in cache, try to fetch from GitHub directly
  const octokit = new Octokit({ auth: source.token });
  const rootPathPrefix = source.rootPath === '/' ? '' : source.rootPath.replace(/^\//, '');
  const filePath = rootPathPrefix ? `${rootPathPrefix}/${taskId}.md` : `${taskId}.md`;

  try {
    const { data } = await octokit.repos.getContent({
      owner: source.owner,
      repo: source.repo,
      path: filePath,
      ref: source.branch,
    });

    // getContent returns file data with sha and content
    if ('sha' in data && 'content' in data && typeof data.content === 'string') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      // Cache the result for future use
      const cacheKey = `${source.owner}/${source.repo}/${filePath}`;
      const task = parseTaskContent(content, `${taskId}.md`);
      githubCache.set(cacheKey, {
        sha: data.sha,
        content,
        task,
        fetchedAt: Date.now(),
      });

      return { sha: data.sha, content, filePath };
    }
  } catch (error: any) {
    // 404 means file doesn't exist, other errors should be logged
    if (error.status !== 404) {
      safeError(`[TasksIPC] Failed to fetch file ${filePath} from GitHub:`, error);
    }
  }

  return null;
}

/**
 * Invalidate cache for a specific file
 */
function invalidateGitHubCache(source: GitHubSourceInfo, filePath: string): void {
  const cacheKey = `${source.owner}/${source.repo}/${filePath}`;
  githubCache.delete(cacheKey);
}

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
        try {
          const octokit = new Octokit({ auth: source.token });

          // Generate unique task ID
          const taskId = `task-${Date.now()}`;
          const now = new Date().toISOString();

          // Build file path
          const fileName = `${taskId}.md`;
          const rootPathPrefix = source.rootPath === '/' ? '' : source.rootPath.replace(/^\//, '');
          const filePath = rootPathPrefix ? `${rootPathPrefix}/${fileName}` : fileName;

          // Generate markdown content
          const taskContent = generateTaskContent({
            id: taskId,
            title: data.title,
            status: 'TODO',
            priority: data.priority || 'MEDIUM',
            assignee: data.assignee || 'user',
            created_at: now,
            updated_at: now,
            start_date: data.start_date,
            due_date: data.due_date,
            tags: data.tags || [],
            content: data.content || '',
            task_size: data.task_size,
            total_hours: data.total_hours,
            notion_id: data.notion_id,
          });

          // Create file on GitHub (no SHA = create new file)
          const { data: result } = await octokit.repos.createOrUpdateFileContents({
            owner: source.owner,
            repo: source.repo,
            path: filePath,
            message: `Create task: ${data.title}`,
            content: Buffer.from(taskContent, 'utf-8').toString('base64'),
            branch: source.branch,
          });

          // Add to cache
          const cacheKey = `${source.owner}/${source.repo}/${filePath}`;
          const task: Task = {
            id: taskId,
            title: data.title,
            status: 'TODO',
            priority: data.priority || 'MEDIUM',
            assignee: data.assignee || 'user',
            created_at: now,
            updated_at: now,
            start_date: data.start_date,
            due_date: data.due_date,
            tags: data.tags || [],
            content: data.content || '',
            task_size: data.task_size,
            total_hours: data.total_hours,
            notion_id: data.notion_id,
            filePath: fileName,
            rawContent: taskContent,
          };

          githubCache.set(cacheKey, {
            sha: result.content?.sha || '',
            content: taskContent,
            task,
            fetchedAt: Date.now(),
          });

          safeLog('[TasksIPC] GitHub task created:', taskId);
          return task;
        } catch (error: any) {
          // Handle GitHub-specific errors
          if (error.status === 409) {
            throw new Error(`GitHub conflict: File already exists. Please refresh and try again.`);
          } else if (error.status === 403 && error.message?.includes('rate limit')) {
            throw new Error(`GitHub rate limit exceeded. Please try again later.`);
          } else if (error.status === 401) {
            throw new Error(`GitHub authentication failed. Please check your token.`);
          } else if (error.status === 404) {
            throw new Error(`GitHub repository not found. Please check your configuration.`);
          }
          throw error;
        }
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
        try {
          const octokit = new Octokit({ auth: source.token });

          // Get current file info from cache
          const fileInfo = await getGitHubFileSha(source, id);
          if (!fileInfo) {
            throw new Error(`Task ${id} not found in GitHub source`);
          }

          // Generate updated markdown content
          const updatedContent = updateTaskFrontmatter(fileInfo.content, data);

          // Update file on GitHub (with SHA)
          const { data: result } = await octokit.repos.createOrUpdateFileContents({
            owner: source.owner,
            repo: source.repo,
            path: fileInfo.filePath,
            message: `Update task: ${id}`,
            content: Buffer.from(updatedContent, 'utf-8').toString('base64'),
            branch: source.branch,
            sha: fileInfo.sha,
          });

          // Parse updated task
          const relativePath = source.rootPath === '/'
            ? fileInfo.filePath
            : fileInfo.filePath.replace(source.rootPath.replace(/^\//, '') + '/', '');
          const task = parseTaskContent(updatedContent, relativePath);

          // Update cache
          const cacheKey = `${source.owner}/${source.repo}/${fileInfo.filePath}`;
          githubCache.set(cacheKey, {
            sha: result.content?.sha || '',
            content: updatedContent,
            task,
            fetchedAt: Date.now(),
          });

          safeLog('[TasksIPC] GitHub task updated:', id);
          return task;
        } catch (error: any) {
          // Handle GitHub-specific errors
          if (error.status === 409) {
            throw new Error(`GitHub conflict: File has been modified on remote. Please refresh and try again.`);
          } else if (error.status === 403 && error.message?.includes('rate limit')) {
            throw new Error(`GitHub rate limit exceeded. Please try again later.`);
          } else if (error.status === 401) {
            throw new Error(`GitHub authentication failed. Please check your token.`);
          } else if (error.status === 404) {
            throw new Error(`GitHub file not found. The task may have been deleted.`);
          }
          throw error;
        }
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
        try {
          const octokit = new Octokit({ auth: source.token });

          // Get current file info from cache
          const fileInfo = await getGitHubFileSha(source, id);
          if (!fileInfo) {
            throw new Error(`Task ${id} not found in GitHub source`);
          }

          // Delete file on GitHub
          await octokit.repos.deleteFile({
            owner: source.owner,
            repo: source.repo,
            path: fileInfo.filePath,
            message: `Delete task: ${id}`,
            sha: fileInfo.sha,
            branch: source.branch,
          });

          // Remove from cache
          invalidateGitHubCache(source, fileInfo.filePath);

          safeLog('[TasksIPC] GitHub task deleted:', id);
          return;
        } catch (error: any) {
          // Handle GitHub-specific errors
          if (error.status === 409) {
            throw new Error(`GitHub conflict: File has been modified on remote. Please refresh and try again.`);
          } else if (error.status === 403 && error.message?.includes('rate limit')) {
            throw new Error(`GitHub rate limit exceeded. Please try again later.`);
          } else if (error.status === 401) {
            throw new Error(`GitHub authentication failed. Please check your token.`);
          } else if (error.status === 404) {
            throw new Error(`GitHub file not found. The task may have already been deleted.`);
          }
          throw error;
        }
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
