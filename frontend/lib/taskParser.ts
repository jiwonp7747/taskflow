import matter from 'gray-matter';
import type { Task, TaskStatus, TaskPriority, TaskAssignee } from '@/types/task';

// Valid status values
const VALID_STATUSES: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'NEED_FIX',
  'COMPLETE',
  'ON_HOLD',
];

// Valid priority values
const VALID_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

// Validate and parse status
function parseStatus(value: unknown): TaskStatus {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }
  return 'TODO';
}

// Validate and parse priority
function parsePriority(value: unknown): TaskPriority {
  if (typeof value === 'string' && VALID_PRIORITIES.includes(value as TaskPriority)) {
    return value as TaskPriority;
  }
  return 'MEDIUM';
}

// Parse assignee
function parseAssignee(value: unknown): TaskAssignee {
  if (typeof value === 'string' && value.trim()) {
    return value.trim() as TaskAssignee;
  }
  return 'user';
}

// Parse tags array
function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string');
  }
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

// Parse date string (required - defaults to now)
function parseDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  return new Date().toISOString();
}

// Parse optional date string (for start_date, due_date)
function parseOptionalDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

// Parse a markdown file content into a Task object
export function parseTaskContent(content: string, filePath: string): Task {
  const { data, content: markdownContent } = matter(content);

  // Extract ID from frontmatter or filename
  const id = typeof data.id === 'string' ? data.id : filePath.split('/').pop()?.replace('.md', '') || `task-${Date.now()}`;

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled Task',
    status: parseStatus(data.status),
    priority: parsePriority(data.priority),
    assignee: parseAssignee(data.assignee),
    created_at: parseDate(data.created_at),
    updated_at: parseDate(data.updated_at),
    start_date: parseOptionalDate(data.start_date),
    due_date: parseOptionalDate(data.due_date),
    tags: parseTags(data.tags),
    task_size: typeof data.task_size === 'string' ? data.task_size : undefined,
    total_hours: typeof data.total_hours === 'number' ? data.total_hours : (typeof data.total_hours === 'string' ? parseFloat(data.total_hours) || undefined : undefined),
    notion_id: typeof data.notion_id === 'string' ? data.notion_id : undefined,
    content: markdownContent.trim(),
    filePath,
    rawContent: content,
  };
}

// Generate markdown content from a Task object
export function generateTaskContent(task: Partial<Task>): string {
  const frontmatter = {
    id: task.id || `task-${Date.now()}`,
    title: task.title || 'Untitled Task',
    status: task.status || 'TODO',
    priority: task.priority || 'MEDIUM',
    assignee: task.assignee || 'user',
    created_at: task.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    start_date: task.start_date,
    due_date: task.due_date,
    tags: task.tags || [],
    task_size: task.task_size,
    total_hours: task.total_hours,
    notion_id: task.notion_id,
  };

  const dateParts = [
    `id: ${frontmatter.id}`,
    `title: ${frontmatter.title}`,
    `status: ${frontmatter.status}`,
    `priority: ${frontmatter.priority}`,
    `assignee: ${frontmatter.assignee}`,
    `created_at: ${frontmatter.created_at}`,
    `updated_at: ${frontmatter.updated_at}`,
  ];

  if (frontmatter.start_date) {
    dateParts.push(`start_date: ${frontmatter.start_date}`);
  }
  if (frontmatter.due_date) {
    dateParts.push(`due_date: ${frontmatter.due_date}`);
  }

  dateParts.push(`tags: [${frontmatter.tags.join(', ')}]`);

  if (frontmatter.task_size) {
    dateParts.push(`task_size: ${frontmatter.task_size}`);
  }
  if (frontmatter.total_hours !== undefined) {
    dateParts.push(`total_hours: ${frontmatter.total_hours}`);
  }
  if (frontmatter.notion_id) {
    dateParts.push(`notion_id: ${frontmatter.notion_id}`);
  }

  return `---
${dateParts.join('\n')}
---

${task.content || ''}
`;
}

// Update frontmatter in existing content
export function updateTaskFrontmatter(
  originalContent: string,
  updates: Partial<Task>
): string {
  const { data, content } = matter(originalContent);

  // If content field is being updated, replace the body
  let updatedContent = updates.content !== undefined ? updates.content : content;

  // Merge updates into frontmatter
  const updatedData = {
    ...data,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Remove non-frontmatter fields
  delete updatedData.content;
  delete updatedData.filePath;
  delete updatedData.rawContent;

  return matter.stringify(updatedContent, updatedData);
}
