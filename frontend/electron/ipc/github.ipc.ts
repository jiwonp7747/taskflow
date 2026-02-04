/**
 * GitHub IPC Handler
 *
 * GitHub 소스 관리를 위한 IPC 핸들러
 */

import { ipcMain } from 'electron';
import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../services/database.service';
import { safeLog, safeError } from '../lib/safeConsole';
import type { SourceConfig, GitHubSourceConfigType } from '../../types/config';

interface GitHubValidationResult {
  valid: boolean;
  owner: string;
  repo: string;
  branch: string;
  rootPath: string;
  exists: boolean;
  isAccessible: boolean;
  taskCount: number;
  error?: string;
  rateLimit?: {
    remaining: number;
    reset: string;
  };
}

interface AddGitHubSourceData {
  name: string;
  owner: string;
  repo: string;
  branch: string;
  rootPath: string;
  token: string;
}

/**
 * Validate GitHub connection
 */
async function validateGitHubConnection(data: {
  owner: string;
  repo: string;
  branch: string;
  rootPath: string;
  token: string;
}): Promise<GitHubValidationResult> {
  try {
    const octokit = new Octokit({ auth: data.token });

    // 1. Check repository access
    try {
      await octokit.repos.get({
        owner: data.owner,
        repo: data.repo,
      });
    } catch (error: any) {
      if (error.status === 404) {
        return {
          valid: false,
          owner: data.owner,
          repo: data.repo,
          branch: data.branch,
          rootPath: data.rootPath,
          exists: false,
          isAccessible: false,
          taskCount: 0,
          error: 'Repository not found',
        };
      }
      if (error.status === 401 || error.status === 403) {
        return {
          valid: false,
          owner: data.owner,
          repo: data.repo,
          branch: data.branch,
          rootPath: data.rootPath,
          exists: true,
          isAccessible: false,
          taskCount: 0,
          error: 'Authentication failed. Check your token.',
        };
      }
      throw error;
    }

    // 2. Check branch exists
    try {
      await octokit.repos.getBranch({
        owner: data.owner,
        repo: data.repo,
        branch: data.branch,
      });
    } catch (error: any) {
      if (error.status === 404) {
        return {
          valid: false,
          owner: data.owner,
          repo: data.repo,
          branch: data.branch,
          rootPath: data.rootPath,
          exists: true,
          isAccessible: true,
          taskCount: 0,
          error: `Branch '${data.branch}' not found`,
        };
      }
      throw error;
    }

    // 3. Check root path exists and count .md files recursively
    let taskCount = 0;
    const rootPathPrefix = data.rootPath === '/' ? '' : data.rootPath.replace(/^\//, '');

    // First verify path exists if not root
    if (rootPathPrefix) {
      try {
        const { data: contents } = await octokit.repos.getContent({
          owner: data.owner,
          repo: data.repo,
          path: rootPathPrefix,
          ref: data.branch,
        });

        if (!Array.isArray(contents)) {
          return {
            valid: false,
            owner: data.owner,
            repo: data.repo,
            branch: data.branch,
            rootPath: data.rootPath,
            exists: true,
            isAccessible: true,
            taskCount: 0,
            error: `Path '${data.rootPath}' is not a directory`,
          };
        }
      } catch (error: any) {
        if (error.status === 404) {
          return {
            valid: false,
            owner: data.owner,
            repo: data.repo,
            branch: data.branch,
            rootPath: data.rootPath,
            exists: true,
            isAccessible: true,
            taskCount: 0,
            error: `Path '${data.rootPath}' not found in repository`,
          };
        }
        throw error;
      }
    }

    // Use Git Tree API for recursive counting
    try {
      const { data: ref } = await octokit.git.getRef({
        owner: data.owner,
        repo: data.repo,
        ref: `heads/${data.branch}`,
      });

      const { data: tree } = await octokit.git.getTree({
        owner: data.owner,
        repo: data.repo,
        tree_sha: ref.object.sha,
        recursive: 'true',
      });

      for (const item of tree.tree) {
        if (
          item.type === 'blob' &&
          item.path?.endsWith('.md') &&
          (rootPathPrefix === '' || item.path.startsWith(rootPathPrefix + '/'))
        ) {
          taskCount++;
        }
      }
    } catch (treeError) {
      safeLog('[GitHubIPC] Tree API fallback, count may be incomplete');
    }

    // 4. Get rate limit info
    const { data: rateLimit } = await octokit.rateLimit.get();

    return {
      valid: true,
      owner: data.owner,
      repo: data.repo,
      branch: data.branch,
      rootPath: data.rootPath,
      exists: true,
      isAccessible: true,
      taskCount,
      rateLimit: {
        remaining: rateLimit.rate.remaining,
        reset: new Date(rateLimit.rate.reset * 1000).toISOString(),
      },
    };
  } catch (error: any) {
    safeError('[GitHubIPC] Validation error:', error);
    return {
      valid: false,
      owner: data.owner,
      repo: data.repo,
      branch: data.branch,
      rootPath: data.rootPath,
      exists: false,
      isAccessible: false,
      taskCount: 0,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Add GitHub source to database
 */
async function addGitHubSource(data: AddGitHubSourceData): Promise<SourceConfig> {
  const db = getDatabase();

  // Validate connection first
  const validation = await validateGitHubConnection(data);
  if (!validation.valid) {
    throw new Error(validation.error || 'GitHub validation failed');
  }

  // Generate virtual path for uniqueness
  const virtualPath = `github://${data.owner}/${data.repo}${data.rootPath}`;

  // Check if source with same path already exists
  const existing = db
    .prepare('SELECT id FROM sources WHERE path = ?')
    .get(virtualPath);

  if (existing) {
    throw new Error(`GitHub source for this repository already exists`);
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  // Store GitHub config as JSON in a separate column or extended table
  // For now, we'll store token encrypted and config in path field as JSON suffix
  const githubConfig = JSON.stringify({
    owner: data.owner,
    repo: data.repo,
    branch: data.branch,
    rootPath: data.rootPath,
    // Token should be encrypted in production
    token: data.token,
  });

  db.prepare(
    `INSERT INTO sources (id, name, path, is_active, created_at, last_accessed, source_type, github_config)
     VALUES (?, ?, ?, 0, ?, ?, 'github', ?)`
  ).run(id, data.name, virtualPath, now, now, githubConfig);

  const row = db
    .prepare(
      'SELECT id, name, path, is_active, created_at, last_accessed, source_type, github_config FROM sources WHERE id = ?'
    )
    .get(id) as any;

  safeLog('[GitHubIPC] GitHub source added:', id, data.name);

  return {
    id: row.id,
    name: row.name,
    path: row.path,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    lastAccessed: row.last_accessed || undefined,
    sourceType: 'github',
    githubConfig: {
      owner: data.owner,
      repo: data.repo,
      branch: data.branch,
      rootPath: data.rootPath,
    },
  };
}

/**
 * Register GitHub IPC handlers
 */
export function registerGitHubIPC(): void {
  // Validate GitHub connection
  ipcMain.handle(
    'github:validate',
    async (_event, data: {
      owner: string;
      repo: string;
      branch: string;
      rootPath: string;
      token: string;
    }): Promise<GitHubValidationResult> => {
      try {
        return await validateGitHubConnection(data);
      } catch (error) {
        safeError('[GitHubIPC] Validation failed:', error);
        throw error;
      }
    }
  );

  // Add GitHub source
  ipcMain.handle(
    'github:addSource',
    async (_event, data: AddGitHubSourceData): Promise<SourceConfig> => {
      try {
        return await addGitHubSource(data);
      } catch (error) {
        safeError('[GitHubIPC] Failed to add GitHub source:', error);
        throw error;
      }
    }
  );

  safeLog('[GitHubIPC] Handlers registered');
}
