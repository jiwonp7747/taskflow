import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask, getTasksDirectoryAsync } from '@/lib/fileSystem';
import type { TaskDetailResponse, TaskUpdateRequest } from '@/types/task';
import { errorResponse, ErrorCodes, type ApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Get a specific task
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TaskDetailResponse | ApiError>> {
  try {
    const { id } = await params;
    const directory = await getTasksDirectoryAsync();
    const task = await getTaskById(id, directory);

    if (!task) {
      return errorResponse(
        ErrorCodes.TASK_NOT_FOUND,
        `Task with ID ${id} not found`,
        404
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to get task:', error);
    return errorResponse(
      ErrorCodes.TASK_FETCH_ERROR,
      'Failed to fetch task',
      500,
      { error: String(error) }
    );
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TaskDetailResponse | ApiError>> {
  try {
    const { id } = await params;
    const body = (await request.json()) as TaskUpdateRequest;
    const directory = await getTasksDirectoryAsync();

    const existingTask = await getTaskById(id, directory);
    if (!existingTask) {
      return errorResponse(
        ErrorCodes.TASK_NOT_FOUND,
        `Task with ID ${id} not found`,
        404
      );
    }

    const task = await updateTask(id, body, directory);

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      {
        error: {
          code: 'TASK_UPDATE_ERROR',
          message: 'Failed to update task',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean } | ApiError>> {
  try {
    const { id } = await params;
    const directory = await getTasksDirectoryAsync();

    const existingTask = await getTaskById(id, directory);
    if (!existingTask) {
      return errorResponse(
        ErrorCodes.TASK_NOT_FOUND,
        `Task with ID ${id} not found`,
        404
      );
    }

    await deleteTask(id, directory);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return errorResponse(
      ErrorCodes.TASK_DELETE_ERROR,
      'Failed to delete task',
      500,
      { error: String(error) }
    );
  }
}
