/**
 * GitHubSourceConfig - GitHub 저장소 소스 설정
 */

export interface GitHubSourceConfig {
  owner: string;       // Repository owner (username or organization)
  repo: string;        // Repository name
  branch: string;      // Branch name (e.g., "main")
  rootPath: string;    // Root path within repo (e.g., "/tasks" or "/")
  token: string;       // Encrypted PAT (Personal Access Token)
}

export interface GitHubValidationResult {
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
    reset: Date;
  };
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  downloadUrl?: string;
}

export interface GitHubFileContent {
  content: string;
  sha: string;
  encoding: string;
}

export interface GitHubCommitResult {
  sha: string;
  message: string;
  url: string;
}

/**
 * Parse GitHub URL to extract owner, repo, branch, and path
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo/tree/branch/path/to/folder
 */
export function parseGitHubUrl(url: string): Partial<GitHubSourceConfig> | null {
  const patterns = [
    // https://github.com/owner/repo/tree/branch/path
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.*))?$/,
    // https://github.com/owner/repo
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        branch: match[3] || 'main',
        rootPath: match[4] ? `/${match[4]}` : '/',
      };
    }
  }

  return null;
}

/**
 * Build GitHub URL from config
 */
export function buildGitHubUrl(config: GitHubSourceConfig): string {
  const basePath = config.rootPath === '/' ? '' : config.rootPath;
  return `https://github.com/${config.owner}/${config.repo}/tree/${config.branch}${basePath}`;
}
