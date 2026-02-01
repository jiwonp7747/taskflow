/**
 * File System Utilities for Electron Main Process
 *
 * 태스크 파일 읽기/쓰기/삭제 및 디렉토리 관리
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Task } from '../../types/task';
import { parseTaskContent, generateTaskContent, updateTaskFrontmatter } from './taskParser';
import { safeError } from './safeConsole';

/**
 * Validate path to prevent directory traversal
 */
export function validatePath(filePath: string, baseDir: string): boolean {
  const resolved = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  return resolved.startsWith(resolvedBase + path.sep) || resolved === resolvedBase;
}

/**
 * Ensure directory exists
 */
export async function ensureDirectory(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Check if directory exists
 */
export async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Scan directory recursively for markdown files
 */
export async function scanTaskDirectory(dir: string): Promise<string[]> {
  await ensureDirectory(dir);

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

/**
 * Read a task file
 */
export async function readTaskFile(filePath: string, baseDir: string): Promise<string> {
  if (!validatePath(filePath, baseDir)) {
    throw new Error('Invalid file path: path traversal detected');
  }
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Write a task file
 */
export async function writeTaskFile(
  filePath: string,
  content: string,
  baseDir: string
): Promise<void> {
  if (!validatePath(filePath, baseDir)) {
    throw new Error('Invalid file path: path traversal detected');
  }
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Delete a task file
 */
export async function deleteTaskFile(filePath: string, baseDir: string): Promise<void> {
  if (!validatePath(filePath, baseDir)) {
    throw new Error('Invalid file path: path traversal detected');
  }
  await fs.unlink(filePath);
}

/**
 * Get all tasks from directory
 */
export async function getAllTasks(dir: string): Promise<Task[]> {
  const filePaths = await scanTaskDirectory(dir);
  const tasks: Task[] = [];

  for (const filePath of filePaths) {
    try {
      const content = await readTaskFile(filePath, dir);
      const task = parseTaskContent(content, filePath);
      tasks.push(task);
    } catch (error) {
      safeError(`[FileSystem] Failed to parse task file: ${filePath}`, error);
    }
  }

  // Sort by updated_at descending
  return tasks.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

/**
 * Get a single task by ID
 */
export async function getTaskById(id: string, dir: string): Promise<Task | null> {
  const tasks = await getAllTasks(dir);
  return tasks.find((task) => task.id === id) || null;
}

/**
 * Create a new task
 */
export async function createTask(
  taskData: Partial<Task>,
  dir: string
): Promise<Task> {
  await ensureDirectory(dir);

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
  await writeTaskFile(filePath, content, dir);

  return parseTaskContent(content, filePath);
}

/**
 * Update an existing task
 */
export async function updateTask(
  id: string,
  updates: Partial<Task>,
  dir: string
): Promise<Task> {
  const task = await getTaskById(id, dir);
  if (!task) {
    throw new Error(`Task with ID ${id} not found`);
  }

  const updatedContent = updateTaskFrontmatter(task.rawContent, updates);
  await writeTaskFile(task.filePath, updatedContent, dir);

  return parseTaskContent(updatedContent, task.filePath);
}

/**
 * Delete a task by ID
 */
export async function deleteTask(id: string, dir: string): Promise<void> {
  const task = await getTaskById(id, dir);
  if (!task) {
    throw new Error(`Task with ID ${id} not found`);
  }

  await deleteTaskFile(task.filePath, dir);
}
