import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask } from '@/lib/fileSystem';
import type { TaskDetailResponse, TaskUpdateRequest, ApiError } from '@/types/task';

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
    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json(
        {
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${id} not found`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to get task:', error);
    return NextResponse.json(
      {
        error: {
          code: 'TASK_FETCH_ERROR',
          message: 'Failed to fetch task',
          details: { error: String(error) },
        },
      },
      { status: 500 }
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

    const existingTask = await getTaskById(id);
    if (!existingTask) {
      return NextResponse.json(
        {
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${id} not found`,
          },
        },
        { status: 404 }
      );
    }

    const task = await updateTask(id, body);

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

    const existingTask = await getTaskById(id);
    if (!existingTask) {
      return NextResponse.json(
        {
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${id} not found`,
          },
        },
        { status: 404 }
      );
    }

    await deleteTask(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      {
        error: {
          code: 'TASK_DELETE_ERROR',
          message: 'Failed to delete task',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}
