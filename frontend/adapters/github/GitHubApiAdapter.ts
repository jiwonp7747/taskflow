/**
 * GitHubApiAdapter - GitHub API Adapter Implementation
 *
 * Octokit을 사용하여 GitHub API와 통신하는 어댑터
 */

import { Octokit } from '@octokit/rest';
import type { IGitHubAdapter } from '@/core/ports/out/IGitHubAdapter';
import type {
  GitHubSourceConfig,
  GitHubValidationResult,
  GitHubContent,
  GitHubFileContent,
  GitHubCommitResult,
} from '@/core/domain/entities/GitHubSourceConfig';
import { ensureDecrypted } from '@/lib/crypto';

export class GitHubApiAdapter implements IGitHubAdapter {
  private getOctokit(token: string): Octokit {
    const decryptedToken = ensureDecrypted(token);
    return new Octokit({ auth: decryptedToken });
  }

  async validateConnection(config: GitHubSourceConfig): Promise<GitHubValidationResult> {
    try {
      const octokit = this.getOctokit(config.token);

      // 1. Check repository access
      const { data: repo } = await octokit.repos.get({
        owner: config.owner,
        repo: config.repo,
      });

      // 2. Check branch exists
      try {
        await octokit.repos.getBranch({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
        });
      } catch (error: any) {
        if (error.status === 404) {
          return {
            valid: false,
            owner: config.owner,
            repo: config.repo,
            branch: config.branch,
            rootPath: config.rootPath,
            exists: true,
            isAccessible: true,
            taskCount: 0,
            error: `Branch '${config.branch}' not found`,
          };
        }
        throw error;
      }

      // 3. Check root path exists and count markdown files recursively
      let taskCount = 0;
      const rootPathPrefix = config.rootPath === '/' ? '' : config.rootPath.replace(/^\//, '');

      // First, verify the path exists if not root
      if (rootPathPrefix) {
        try {
          const { data: contents } = await octokit.repos.getContent({
            owner: config.owner,
            repo: config.repo,
            path: rootPathPrefix,
            ref: config.branch,
          });

          if (!Array.isArray(contents)) {
            return {
              valid: false,
              owner: config.owner,
              repo: config.repo,
              branch: config.branch,
              rootPath: config.rootPath,
              exists: true,
              isAccessible: true,
              taskCount: 0,
              error: `Path '${config.rootPath}' is not a directory`,
            };
          }
        } catch (error: any) {
          if (error.status === 404) {
            return {
              valid: false,
              owner: config.owner,
              repo: config.repo,
              branch: config.branch,
              rootPath: config.rootPath,
              exists: true,
              isAccessible: true,
              taskCount: 0,
              error: `Path '${config.rootPath}' not found in repository`,
            };
          }
          throw error;
        }
      }

      // Use Git Tree API for recursive counting (same as getMarkdownFiles)
      try {
        const { data: ref } = await octokit.git.getRef({
          owner: config.owner,
          repo: config.repo,
          ref: `heads/${config.branch}`,
        });

        const { data: tree } = await octokit.git.getTree({
          owner: config.owner,
          repo: config.repo,
          tree_sha: ref.object.sha,
          recursive: 'true',
        });

        for (const item of tree.tree) {
          if (
            item.type === 'blob' &&
            item.path?.endsWith('.md') &&
            (rootPathPrefix === '' || item.path.startsWith(rootPathPrefix + '/') || item.path === rootPathPrefix)
          ) {
            taskCount++;
          }
        }
      } catch (treeError) {
        // Fallback: if tree API fails, just show 0 (validation still passes)
        console.warn('Failed to count files via tree API:', treeError);
      }

      // 4. Get rate limit info
      const { data: rateLimit } = await octokit.rateLimit.get();

      return {
        valid: true,
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        rootPath: config.rootPath,
        exists: true,
        isAccessible: true,
        taskCount,
        rateLimit: {
          remaining: rateLimit.rate.remaining,
          reset: new Date(rateLimit.rate.reset * 1000),
        },
      };
    } catch (error: any) {
      return {
        valid: false,
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        rootPath: config.rootPath,
        exists: error.status !== 404,
        isAccessible: error.status !== 401 && error.status !== 403,
        taskCount: 0,
        error: error.message || 'Unknown error',
      };
    }
  }

  async getContents(config: GitHubSourceConfig, path: string): Promise<GitHubContent[]> {
    const octokit = this.getOctokit(config.token);
    const fullPath = this.joinPaths(config.rootPath, path);

    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: fullPath.replace(/^\//, '') || '',
      ref: config.branch,
    });

    if (!Array.isArray(data)) {
      throw new Error(`Path '${path}' is not a directory`);
    }

    return data.map((item: any) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      size: item.size,
      type: item.type as 'file' | 'dir',
      downloadUrl: item.download_url,
    }));
  }

  async getFileContent(config: GitHubSourceConfig, path: string): Promise<GitHubFileContent> {
    const octokit = this.getOctokit(config.token);
    const fullPath = this.joinPaths(config.rootPath, path);

    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: fullPath.replace(/^\//, ''),
      ref: config.branch,
    });

    if (Array.isArray(data)) {
      throw new Error(`Path '${path}' is a directory, not a file`);
    }

    const content = 'content' in data ? data.content : '';
    const encoding = 'encoding' in data ? data.encoding : 'base64';

    // Decode base64 content
    const decodedContent = encoding === 'base64'
      ? Buffer.from(content, 'base64').toString('utf-8')
      : content;

    return {
      content: decodedContent,
      sha: data.sha,
      encoding,
    };
  }

  async createOrUpdateFile(
    config: GitHubSourceConfig,
    path: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<GitHubCommitResult> {
    const octokit = this.getOctokit(config.token);
    const fullPath = this.joinPaths(config.rootPath, path);

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      path: fullPath.replace(/^\//, ''),
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      branch: config.branch,
      sha,
    });

    return {
      sha: data.commit?.sha || '',
      message: data.commit?.message || '',
      url: data.commit?.html_url || '',
    };
  }

  async deleteFile(
    config: GitHubSourceConfig,
    path: string,
    message: string,
    sha: string,
  ): Promise<GitHubCommitResult> {
    const octokit = this.getOctokit(config.token);
    const fullPath = this.joinPaths(config.rootPath, path);

    const { data } = await octokit.repos.deleteFile({
      owner: config.owner,
      repo: config.repo,
      path: fullPath.replace(/^\//, ''),
      message,
      sha,
      branch: config.branch,
    });

    return {
      sha: data.commit?.sha || '',
      message: data.commit?.message || '',
      url: data.commit?.html_url || '',
    };
  }

  async getLatestCommitSha(config: GitHubSourceConfig): Promise<string> {
    const octokit = this.getOctokit(config.token);

    const { data } = await octokit.repos.getBranch({
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
    });

    return data.commit.sha;
  }

  async getMarkdownFiles(config: GitHubSourceConfig): Promise<GitHubContent[]> {
    const octokit = this.getOctokit(config.token);
    const mdFiles: GitHubContent[] = [];

    // Use Git Tree API for efficient recursive listing
    const { data: ref } = await octokit.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${config.branch}`,
    });

    const { data: tree } = await octokit.git.getTree({
      owner: config.owner,
      repo: config.repo,
      tree_sha: ref.object.sha,
      recursive: 'true',
    });

    const rootPathPrefix = config.rootPath === '/' ? '' : config.rootPath.replace(/^\//, '');

    for (const item of tree.tree) {
      if (
        item.type === 'blob' &&
        item.path?.endsWith('.md') &&
        (rootPathPrefix === '' || item.path.startsWith(rootPathPrefix + '/') || item.path === rootPathPrefix)
      ) {
        // Remove root path prefix from path
        const relativePath = rootPathPrefix
          ? item.path.replace(rootPathPrefix + '/', '')
          : item.path;

        mdFiles.push({
          name: item.path?.split('/').pop() || '',
          path: relativePath,
          sha: item.sha || '',
          size: item.size || 0,
          type: 'file',
        });
      }
    }

    return mdFiles;
  }

  async getRateLimit(token: string): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }> {
    const octokit = this.getOctokit(token);
    const { data } = await octokit.rateLimit.get();

    return {
      remaining: data.rate.remaining,
      limit: data.rate.limit,
      reset: new Date(data.rate.reset * 1000),
    };
  }

  private joinPaths(...paths: string[]): string {
    return paths
      .map((p) => p.replace(/^\/|\/$/g, ''))
      .filter(Boolean)
      .join('/');
  }
}
