/**
 * GitHub Validation API Route
 *
 * POST /api/config/sources/github/validate - Validate GitHub connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSourceService } from '@/infrastructure/container';
import type { GitHubSourceConfig } from '@/core/domain/entities/GitHubSourceConfig';
import { parseGitHubUrl } from '@/core/domain/entities/GitHubSourceConfig';

interface ValidateRequest {
  url?: string;
  owner?: string;
  repo?: string;
  branch?: string;
  rootPath?: string;
  token: string;
}

/**
 * POST /api/config/sources/github/validate
 * Validate GitHub connection without adding source
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json();

    if (!body.token) {
      return NextResponse.json(
        { error: 'GitHub token is required' },
        { status: 400 }
      );
    }

    let config: GitHubSourceConfig;

    if (body.url) {
      const parsed = parseGitHubUrl(body.url);
      if (!parsed || !parsed.owner || !parsed.repo) {
        return NextResponse.json(
          { error: 'Invalid GitHub URL format' },
          { status: 400 }
        );
      }

      config = {
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch || body.branch || 'main',
        rootPath: parsed.rootPath || body.rootPath || '/',
        token: body.token, // Don't encrypt for validation
      };
    } else {
      if (!body.owner || !body.repo) {
        return NextResponse.json(
          { error: 'Either url or (owner and repo) is required' },
          { status: 400 }
        );
      }

      config = {
        owner: body.owner,
        repo: body.repo,
        branch: body.branch || 'main',
        rootPath: body.rootPath || '/',
        token: body.token,
      };
    }

    const sourceService = getSourceService();
    const result = await sourceService.validateGitHubSource(config);

    return NextResponse.json({
      valid: result.valid,
      owner: result.owner,
      repo: result.repo,
      branch: result.branch,
      rootPath: result.rootPath,
      exists: result.exists,
      isAccessible: result.isAccessible,
      taskCount: result.taskCount,
      error: result.error,
      rateLimit: result.rateLimit ? {
        remaining: result.rateLimit.remaining,
        reset: result.rateLimit.reset.toISOString(),
      } : undefined,
    });
  } catch (error) {
    console.error('GitHub validation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    );
  }
}
