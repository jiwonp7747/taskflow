import { NextRequest, NextResponse } from 'next/server';
import {
  loadConfig,
  saveConfig,
  addSource,
  validateSourcePath,
  setActiveSource,
  createSourceDirectory,
} from '@/lib/config';
import type { AppConfig, AddSourceRequest, SourceValidationResult } from '@/types/config';
import { errorResponse, ErrorCodes, type ApiError } from '@/lib/api/errors';

// GET /api/config - Get current configuration
export async function GET(): Promise<NextResponse<{ config: AppConfig } | ApiError>> {
  try {
    const config = await loadConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to load config:', error);
    return errorResponse(
      ErrorCodes.CONFIG_LOAD_ERROR,
      'Failed to load configuration',
      500,
      { error: String(error) }
    );
  }
}

// POST /api/config - Add a new source
export async function POST(
  request: NextRequest
): Promise<NextResponse<{ source: unknown; validation: SourceValidationResult } | ApiError>> {
  try {
    const body = (await request.json()) as AddSourceRequest;

    if (!body.name?.trim()) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Source name is required',
        400
      );
    }

    if (!body.path?.trim()) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Source path is required',
        400
      );
    }

    // Validate the path
    let validation = await validateSourcePath(body.path);

    // If directory doesn't exist and createIfNotExist is true, create it
    if (!validation.exists && body.createIfNotExist) {
      try {
        await createSourceDirectory(body.path);
        validation = await validateSourcePath(body.path);
      } catch (createError) {
        return errorResponse(
          ErrorCodes.DIRECTORY_CREATE_ERROR,
          'Failed to create directory',
          500,
          { error: String(createError) }
        );
      }
    }

    // If directory doesn't exist and createIfNotExist is false/undefined
    if (!validation.exists && !body.createIfNotExist) {
      return errorResponse(
        ErrorCodes.DIRECTORY_NOT_FOUND,
        'Directory does not exist. Enable "Create folder if it doesn\'t exist" option.',
        400
      );
    }

    if (!validation.valid) {
      return errorResponse(
        ErrorCodes.INVALID_PATH,
        validation.error || 'Invalid source path',
        400
      );
    }

    const source = await addSource(body.name.trim(), body.path.trim());

    return NextResponse.json({ source, validation }, { status: 201 });
  } catch (error) {
    console.error('Failed to add source:', error);
    return errorResponse(
      ErrorCodes.SOURCE_ADD_ERROR,
      String(error),
      500
    );
  }
}

// PUT /api/config - Update configuration
export async function PUT(
  request: NextRequest
): Promise<NextResponse<{ config: AppConfig } | ApiError>> {
  try {
    const body = (await request.json()) as Partial<AppConfig>;
    const config = await loadConfig();

    // Update allowed fields
    if (body.theme !== undefined) {
      config.theme = body.theme;
    }
    if (body.sidebarCollapsed !== undefined) {
      config.sidebarCollapsed = body.sidebarCollapsed;
    }
    if (body.activeSourceId !== undefined && body.activeSourceId !== null) {
      await setActiveSource(body.activeSourceId);
    }

    await saveConfig(config);

    const updatedConfig = await loadConfig();
    return NextResponse.json({ config: updatedConfig });
  } catch (error) {
    console.error('Failed to update config:', error);
    return errorResponse(
      ErrorCodes.CONFIG_UPDATE_ERROR,
      'Failed to update configuration',
      500,
      { error: String(error) }
    );
  }
}
