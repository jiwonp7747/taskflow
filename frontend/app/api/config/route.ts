import { NextRequest, NextResponse } from 'next/server';
import { getSourceService, getConfigService } from '@/infrastructure/container';
import type { AppConfig, AddSourceRequest, SourceValidationResult, SourceConfig } from '@/types/config';
import type { Source } from '@/domain/entities/Source';

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
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

// GET /api/config - Get current configuration
export async function GET(): Promise<NextResponse<{ config: AppConfig } | ApiError>> {
  try {
    const configService = getConfigService();
    const sourceService = getSourceService();

    const appConfig = await configService.getAppConfig();
    const sources = await sourceService.getAllSources();

    const config: AppConfig = {
      sources: sources.map(sourceToConfig),
      activeSourceId: appConfig.activeSourceId,
      theme: appConfig.theme,
      sidebarCollapsed: appConfig.sidebarCollapsed,
      aiWorker: appConfig.aiWorker,
    };

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
    const sourceService = getSourceService();
    let validation = await sourceService.validatePath(body.path);

    // If directory doesn't exist and createIfNotExist is true, create it
    if (!validation.exists && body.createIfNotExist) {
      try {
        await sourceService.createSourceDirectory(body.path);
        validation = await sourceService.validatePath(body.path);
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

    // If directory doesn't exist and createIfNotExist is false/undefined
    if (!validation.exists && !body.createIfNotExist) {
      return NextResponse.json(
        {
          error: {
            code: 'DIRECTORY_NOT_FOUND',
            message: 'Directory does not exist. Enable "Create folder if it doesn\'t exist" option.',
          },
        },
        { status: 400 }
      );
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

    const source = await sourceService.addSource({ name: body.name.trim(), path: body.path.trim() });
    const sourceConfig = sourceToConfig(source);

    return NextResponse.json({ source: sourceConfig, validation }, { status: 201 });
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
    const configService = getConfigService();
    const sourceService = getSourceService();

    // Update allowed fields
    const updates: {
      theme?: AppConfig['theme'];
      sidebarCollapsed?: boolean;
      activeSourceId?: string | null;
    } = {};

    if (body.theme !== undefined) {
      updates.theme = body.theme;
    }
    if (body.sidebarCollapsed !== undefined) {
      updates.sidebarCollapsed = body.sidebarCollapsed;
    }
    if (body.activeSourceId !== undefined && body.activeSourceId !== null) {
      await sourceService.setActiveSource(body.activeSourceId);
      updates.activeSourceId = body.activeSourceId;
    }

    await configService.updateConfig(updates);

    // Get updated config
    const appConfig = await configService.getAppConfig();
    const sources = await sourceService.getAllSources();

    const config: AppConfig = {
      sources: sources.map(sourceToConfig),
      activeSourceId: appConfig.activeSourceId,
      theme: appConfig.theme,
      sidebarCollapsed: appConfig.sidebarCollapsed,
      aiWorker: appConfig.aiWorker,
    };

    return NextResponse.json({ config });
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
