import { NextRequest, NextResponse } from 'next/server';
import { getSourceService } from '@/infrastructure/container';
import type { SourceConfig, UpdateSourceRequest } from '@/types/config';
import type { Source } from '@/domain/entities/Source';

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Helper function to convert Source entity to SourceConfig
const sourceToConfig = (s: Source): SourceConfig => ({
  id: s.id,
  name: s.name,
  path: s.path,
  isActive: s.isActive,
  createdAt: s.createdAt.toISOString(),
  lastAccessed: s.lastAccessed?.toISOString(),
});

// GET /api/config/sources/[id] - Get a specific source
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ source: SourceConfig } | ApiError>> {
  const { id } = await context.params;

  try {
    const sourceService = getSourceService();
    const sources = await sourceService.getAllSources();
    const source = sources.find(s => s.id === id);

    if (!source) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Source not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ source: sourceToConfig(source) });
  } catch (error) {
    console.error('Failed to get source:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SOURCE_GET_ERROR',
          message: 'Failed to get source',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/config/sources/[id] - Update a source
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ source: SourceConfig } | ApiError>> {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateSourceRequest;
    const sourceService = getSourceService();

    // If path is being updated, validate it first
    if (body.path) {
      const validation = await sourceService.validatePath(body.path);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_PATH',
              message: validation.error || 'Invalid source path',
            },
          },
          { status: 400 }
        );
      }
    }

    const source = await sourceService.updateSource(id, {
      name: body.name,
      path: body.path,
    });
    return NextResponse.json({ source: sourceToConfig(source) });
  } catch (error) {
    console.error('Failed to update source:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SOURCE_UPDATE_ERROR',
          message: String(error),
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/config/sources/[id] - Delete a source
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ success: boolean } | ApiError>> {
  const { id } = await context.params;

  try {
    const sourceService = getSourceService();
    await sourceService.deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete source:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SOURCE_DELETE_ERROR',
          message: String(error),
        },
      },
      { status: 500 }
    );
  }
}

// PATCH /api/config/sources/[id] - Set as active source
export async function PATCH(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ success: boolean } | ApiError>> {
  const { id } = await context.params;

  try {
    const sourceService = getSourceService();
    await sourceService.setActiveSource(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to set active source:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SET_ACTIVE_ERROR',
          message: String(error),
        },
      },
      { status: 500 }
    );
  }
}
