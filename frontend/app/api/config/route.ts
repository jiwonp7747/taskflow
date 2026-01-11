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

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// GET /api/config - Get current configuration
export async function GET(): Promise<NextResponse<{ config: AppConfig } | ApiError>> {
  try {
    const config = await loadConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to load config:', error);
    return NextResponse.json(
      {
        error: {
          code: 'CONFIG_LOAD_ERROR',
          message: 'Failed to load configuration',
          details: { error: String(error) },
        },
      },
      { status: 500 }
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
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Source name is required',
          },
        },
        { status: 400 }
      );
    }

    if (!body.path?.trim()) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Source path is required',
          },
        },
        { status: 400 }
      );
    }

    // Validate the path
    let validation = await validateSourcePath(body.path);

    // If directory doesn't exist, create it
    if (!validation.exists) {
      try {
        await createSourceDirectory(body.path);
        validation = await validateSourcePath(body.path);
      } catch (createError) {
        return NextResponse.json(
          {
            error: {
              code: 'DIRECTORY_CREATE_ERROR',
              message: 'Failed to create directory',
              details: { error: String(createError) },
            },
          },
          { status: 500 }
        );
      }
    }

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

    const source = await addSource(body.name.trim(), body.path.trim());

    return NextResponse.json({ source, validation }, { status: 201 });
  } catch (error) {
    console.error('Failed to add source:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SOURCE_ADD_ERROR',
          message: String(error),
        },
      },
      { status: 500 }
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
    return NextResponse.json(
      {
        error: {
          code: 'CONFIG_UPDATE_ERROR',
          message: 'Failed to update configuration',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}
