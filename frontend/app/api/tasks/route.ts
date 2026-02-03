import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, createTask, getTasksDirectoryAsync } from '@/lib/fileSystem';
import { loadConfig } from '@/lib/config';
import type { TaskListResponse, TaskCreateRequest } from '@/types/task';
import { errorResponse, ErrorCodes, type ApiError } from '@/lib/api/errors';

// GET /api/tasks - Get all tasks
export async function GET(): Promise<NextResponse<TaskListResponse | ApiError>> {
  try {
    // Check if any source is configured
    const config = await loadConfig();
    if (config.sources.length === 0) {
      return errorResponse(
        ErrorCodes.NO_SOURCE_CONFIGURED,
        'No task source folder configured. Please add a source folder to get started.',
        400
      );
    }

    const directory = await getTasksDirectoryAsync();
    const tasks = await getAllTasks(directory);

    return NextResponse.json({
      tasks,
      total: tasks.length,
      directory,
    });
  } catch (error) {
    console.error('Failed to get tasks:', error);
    return errorResponse(
      ErrorCodes.TASKS_FETCH_ERROR,
      'Failed to fetch tasks',
      500,
      { error: String(error) }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(
  request: NextRequest
): Promise<NextResponse<{ task: ReturnType<typeof createTask> extends Promise<infer T> ? T : never } | ApiError>> {
  try {
    const body = (await request.json()) as TaskCreateRequest;

    if (!body.title?.trim()) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Title is required',
        400
      );
    }

    // Get the active tasks directory
    const directory = await getTasksDirectoryAsync();

    const task = await createTask(
      {
        title: body.title.trim(),
        priority: body.priority || 'MEDIUM',
        assignee: body.assignee || 'user',
        tags: body.tags || [],
        content: body.content || '',
        status: 'TODO',
      },
      directory
    );

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return errorResponse(
      ErrorCodes.TASK_CREATE_ERROR,
      'Failed to create task',
      500,
      { error: String(error) }
    );
  }
}
