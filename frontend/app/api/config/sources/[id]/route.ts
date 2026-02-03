import { NextRequest, NextResponse } from 'next/server';
import {
  loadConfig,
  updateSource,
  deleteSource,
  setActiveSource,
  validateSourcePath,
} from '@/lib/config';
import type { SourceConfig, UpdateSourceRequest } from '@/types/config';
import { errorResponse, ErrorCodes, type ApiError } from '@/lib/api/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/config/sources/[id] - Get a specific source
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ source: SourceConfig } | ApiError>> {
  const { id } = await context.params;

  try {
    const config = await loadConfig();
    const source = config.sources.find(s => s.id === id);

    if (!source) {
      return errorResponse(
        ErrorCodes.SOURCE_NOT_FOUND,
        'Source not found',
        404
      );
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Failed to get source:', error);
    return errorResponse(
      'SOURCE_GET_ERROR',
      'Failed to get source',
      500,
      { error: String(error) }
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

    // If path is being updated, validate it first
    if (body.path) {
      const validation = await validateSourcePath(body.path);
      if (!validation.valid) {
        return errorResponse(
          ErrorCodes.INVALID_PATH,
          validation.error || 'Invalid source path',
          400
        );
      }
    }

    const source = await updateSource(id, body);
    return NextResponse.json({ source });
  } catch (error) {
    console.error('Failed to update source:', error);
    return errorResponse(
      'SOURCE_UPDATE_ERROR',
      String(error),
      500
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
    await deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete source:', error);
    return errorResponse(
      ErrorCodes.SOURCE_DELETE_ERROR,
      String(error),
      500
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
    await setActiveSource(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to set active source:', error);
    return errorResponse(
      'SET_ACTIVE_ERROR',
      String(error),
      500
    );
  }
}
