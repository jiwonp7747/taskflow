/**
 * GitHub Source API Routes
 *
 * POST /api/config/sources/github - Add new GitHub source
 * POST /api/config/sources/github/validate - Validate GitHub connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSourceService } from '@/infrastructure/container';
import type { GitHubSourceConfig } from '@/core/domain/entities/GitHubSourceConfig';
import { parseGitHubUrl } from '@/core/domain/entities/GitHubSourceConfig';
import { encrypt } from '@/lib/crypto';

interface AddGitHubSourceRequest {
  name: string;
  url?: string; // GitHub URL to parse
  githubConfig?: {
    owner: string;
    repo: string;
    branch: string;
    rootPath: string;
    token: string;
  };
}

interface ValidateRequest {
  url?: string;
  githubConfig?: {
    owner: string;
    repo: string;
    branch: string;
    rootPath: string;
    token: string;
  };
}

/**
 * POST /api/config/sources/github
 * Add a new GitHub source
 */
export async function POST(request: NextRequest) {
  try {
    const body: AddGitHubSourceRequest = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    let config: GitHubSourceConfig;

    if (body.url) {
      // Parse from URL
      const parsed = parseGitHubUrl(body.url);
      if (!parsed || !parsed.owner || !parsed.repo) {
        return NextResponse.json(
          { error: 'Invalid GitHub URL format' },
          { status: 400 }
        );
      }

      if (!body.githubConfig?.token) {
        return NextResponse.json(
          { error: 'GitHub token is required' },
          { status: 400 }
        );
      }

      config = {
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch || 'main',
        rootPath: parsed.rootPath || '/',
        token: encrypt(body.githubConfig.token),
      };
    } else if (body.githubConfig) {
      // Use provided config
      const { owner, repo, branch, rootPath, token } = body.githubConfig;

      if (!owner || !repo || !token) {
        return NextResponse.json(
          { error: 'owner, repo, and token are required' },
          { status: 400 }
        );
      }

      config = {
        owner,
        repo,
        branch: branch || 'main',
        rootPath: rootPath || '/',
        token: encrypt(token),
      };
    } else {
      return NextResponse.json(
        { error: 'Either url or githubConfig is required' },
        { status: 400 }
      );
    }

    const sourceService = getSourceService();
    const source = await sourceService.addGitHubSource({
      name: body.name,
      githubConfig: config,
    });

    return NextResponse.json({
      id: source.id,
      name: source.name,
      path: source.path,
      sourceType: source.sourceType,
      isActive: source.isActive,
      createdAt: source.createdAt.toISOString(),
      githubConfig: {
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        rootPath: config.rootPath,
        // Don't return token
      },
    });
  } catch (error) {
    console.error('Failed to add GitHub source:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add GitHub source' },
      { status: 500 }
    );
  }
}
