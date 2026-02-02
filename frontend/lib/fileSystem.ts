import { promises as fs } from 'fs';
import path from 'path';
import type { Task } from '@/types/task';
import { parseTaskContent, generateTaskContent, updateTaskFrontmatter } from './taskParser';
import { getActiveTasksDirectory } from './config';

// Default tasks directory (fallback)
const DEFAULT_TASKS_DIR = process.env.TASKS_DIR || path.join(process.cwd(), 'tasks');

// Validate path to prevent directory traversal
function validatePath(filePath: string, baseDir: string): boolean {
  const resolved = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  return resolved.startsWith(resolvedBase);
}

// Ensure tasks directory exists
export async function ensureTasksDirectory(dir?: string): Promise<void> {
  const targetDir = dir || await getActiveTasksDirectory();
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

// Get the tasks directory path (async to support dynamic config)
export async function getTasksDirectoryAsync(): Promise<string> {
  return await getActiveTasksDirectory();
}

// Get the tasks directory path (sync fallback - deprecated, use getTasksDirectoryAsync)
export function getTasksDirectory(): string {
  return DEFAULT_TASKS_DIR;
}

// Scan directory recursively for markdown files
export async function scanTaskDirectory(dir: string = DEFAULT_TASKS_DIR): Promise<string[]> {
  await ensureTasksDirectory(dir);

  const mdFiles: string[] = [];

  async function scanDir(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.md')) {
        mdFiles.push(fullPath);
      }
    }
  }

  await scanDir(dir);
  return mdFiles;
}

// Read a task file
export async function readTaskFile(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  if (!validatePath(filePath, dir)) {
    throw new Error('Invalid file path');
  }

  return fs.readFile(filePath, 'utf-8');
}

// Write a task file
export async function writeTaskFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!validatePath(filePath, dir)) {
    throw new Error('Invalid file path');
  }

  await fs.writeFile(filePath, content, 'utf-8');
}

// Delete a task file
export async function deleteTaskFile(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!validatePath(filePath, dir)) {
    throw new Error('Invalid file path');
  }

  await fs.unlink(filePath);
}

// Get all tasks from the directory
export async function getAllTasks(dir: string = DEFAULT_TASKS_DIR): Promise<Task[]> {
  const filePaths = await scanTaskDirectory(dir);
  const tasks: Task[] = [];

  for (const filePath of filePaths) {
    try {
      const content = await readTaskFile(filePath);
      const task = parseTaskContent(content, filePath);
      tasks.push(task);
    } catch (error) {
      console.error(`Failed to parse task file: ${filePath}`, error);
      // Skip invalid files
    }
  }

  // Sort by updated_at descending
  return tasks.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

// Get a single task by ID
export async function getTaskById(
  id: string,
  dir: string = DEFAULT_TASKS_DIR
): Promise<Task | null> {
  const tasks = await getAllTasks(dir);
  return tasks.find((task) => task.id === id) || null;
}

// Create a new task
export async function createTask(
  taskData: Partial<Task>,
  dir: string = DEFAULT_TASKS_DIR
): Promise<Task> {
  await ensureTasksDirectory(dir);

  const id = taskData.id || `task-${Date.now()}`;
  const filename = `${id}.md`;
  const filePath = path.join(dir, filename);

  // Check if file already exists
  try {
    await fs.access(filePath);
    throw new Error(`Task with ID ${id} already exists`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const content = generateTaskContent({ ...taskData, id });
  await writeTaskFile(filePath, content);

  return parseTaskContent(content, filePath);
}

// Update an existing task
export async function updateTask(
  id: string,
  updates: Partial<Task>,
  dir: string = DEFAULT_TASKS_DIR
): Promise<Task> {
  const task = await getTaskById(id, dir);
  if (!task) {
    throw new Error(`Task with ID ${id} not found`);
  }

  const updatedContent = updateTaskFrontmatter(task.rawContent, updates);
  await writeTaskFile(task.filePath, updatedContent);

  return parseTaskContent(updatedContent, task.filePath);
}

// Delete a task by ID
export async function deleteTask(
  id: string,
  dir: string = DEFAULT_TASKS_DIR
): Promise<void> {
  const task = await getTaskById(id, dir);
  if (!task) {
    throw new Error(`Task with ID ${id} not found`);
  }

  await deleteTaskFile(task.filePath);
}

// Find task file path by ID
export async function findTaskFilePath(
  id: string,
  dir: string = DEFAULT_TASKS_DIR
): Promise<string | null> {
  const task = await getTaskById(id, dir);
  return task?.filePath || null;
}
