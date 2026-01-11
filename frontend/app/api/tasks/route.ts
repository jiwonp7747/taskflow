import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, createTask, getTasksDirectoryAsync } from '@/lib/fileSystem';
import type { TaskListResponse, TaskCreateRequest, ApiError } from '@/types/task';

// GET /api/tasks - Get all tasks
export async function GET(): Promise<NextResponse<TaskListResponse | ApiError>> {
  try {
    const directory = await getTasksDirectoryAsync();
    const tasks = await getAllTasks(directory);

    return NextResponse.json({
      tasks,
      total: tasks.length,
      directory,
    });
  } catch (error) {
    console.error('Failed to get tasks:', error);
    return NextResponse.json(
      {
        error: {
          code: 'TASKS_FETCH_ERROR',
          message: 'Failed to fetch tasks',
          details: { error: String(error) },
        },
      },
      { status: 500 }
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
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title is required',
          },
        },
        { status: 400 }
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
        description: body.description || '',
        requirements: body.requirements || '',
        status: 'TODO',
      },
      directory
    );

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      {
        error: {
          code: 'TASK_CREATE_ERROR',
          message: 'Failed to create task',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}
