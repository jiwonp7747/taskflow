/**
 * Task Parser for Electron Main Process
 *
 * 마크다운 태스크 파일 파싱 및 생성
 */

import matter from 'gray-matter';
import type { Task, TaskStatus, TaskPriority, TaskAssignee } from '../../types/task';

// Custom gray-matter options to prevent automatic date parsing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const matterOptions: any = {
  engines: {
    yaml: {
      parse: (str: string): object => {
        // Use a simple YAML parser that doesn't convert dates
        const lines = str.split('\n');
        const result: Record<string, unknown> = {};
        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;
          const key = line.slice(0, colonIndex).trim();
          let value: unknown = line.slice(colonIndex + 1).trim();

          // Handle arrays like [tag1, tag2]
          if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(v => v.trim()).filter(Boolean);
          }
          // Handle quoted strings - remove quotes but keep content as string
          else if (typeof value === 'string' && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
            value = value.slice(1, -1);
          }
          // Handle numbers
          else if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
            value = parseFloat(value);
          }
          // Handle booleans
          else if (value === 'true') value = true;
          else if (value === 'false') value = false;
          // Keep everything else as string (including date-like strings)

          if (key) result[key] = value;
        }
        return result;
      },
      stringify: (data: object): string => {
        // This won't be used since we manually build YAML
        return Object.entries(data)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
      }
    }
  }
};

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

function parseStatus(value: unknown): TaskStatus {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }
  return 'TODO';
}

function parsePriority(value: unknown): TaskPriority {
  if (typeof value === 'string' && VALID_PRIORITIES.includes(value as TaskPriority)) {
    return value as TaskPriority;
  }
  return 'MEDIUM';
}

function parseAssignee(value: unknown): TaskAssignee {
  if (typeof value === 'string' && value.trim()) {
    return value.trim() as TaskAssignee;
  }
  return 'user';
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string');
  }
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

// Format Date as local time ISO string (without Z suffix)
function toLocalISOString(date: Date): string {
  const y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${y}-${M}-${d}T${h}:${m}:${s}.${ms}`;
}

// Parse date string preserving local time (required - defaults to now)
function parseDate(value: unknown): string {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? toLocalISOString(new Date()) : toLocalISOString(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Has timezone info - parse and convert to local
    if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed);
      return isNaN(date.getTime()) ? toLocalISOString(new Date()) : toLocalISOString(date);
    }
    // No timezone - treat as local, validate and return as-is
    const date = new Date(trimmed.includes('T') ? trimmed : trimmed + 'T00:00:00');
    return isNaN(date.getTime()) ? toLocalISOString(new Date()) : trimmed;
  }
  return toLocalISOString(new Date());
}

// Parse optional date string preserving local time (for start_date, due_date)
function parseOptionalDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : toLocalISOString(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    // Has timezone info - parse and convert to local
    if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed);
      return isNaN(date.getTime()) ? undefined : toLocalISOString(date);
    }
    // No timezone - treat as local, validate and return as-is
    const date = new Date(trimmed.includes('T') ? trimmed : trimmed + 'T00:00:00');
    return isNaN(date.getTime()) ? undefined : trimmed;
  }
  return undefined;
}

/**
 * Parse markdown content into Task object
 */
export function parseTaskContent(content: string, filePath: string): Task {
  const { data, content: markdownContent } = matter(content, matterOptions);

  const id = typeof data.id === 'string'
    ? data.id
    : filePath.split('/').pop()?.replace('.md', '') || `task-${Date.now()}`;

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

/**
 * Generate markdown content from Task object
 */
export function generateTaskContent(task: Partial<Task>): string {
  const frontmatter = {
    id: task.id || `task-${Date.now()}`,
    title: task.title || 'Untitled Task',
    status: task.status || 'TODO',
    priority: task.priority || 'MEDIUM',
    assignee: task.assignee || 'user',
    created_at: task.created_at || toLocalISOString(new Date()),
    updated_at: toLocalISOString(new Date()),
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
    `created_at: "${frontmatter.created_at}"`,
    `updated_at: "${frontmatter.updated_at}"`,
  ];

  if (frontmatter.start_date) {
    dateParts.push(`start_date: "${frontmatter.start_date}"`);
  }
  if (frontmatter.due_date) {
    dateParts.push(`due_date: "${frontmatter.due_date}"`);
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

// Serialize value for YAML frontmatter (quote strings that look like dates)
function serializeYamlValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return `[${value.map(v => typeof v === 'string' ? v : String(v)).join(', ')}]`;
  }
  if (typeof value === 'string') {
    // Quote date-like strings to prevent gray-matter from parsing them as Date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return `"${value}"`;
    }
    // Quote strings that contain special YAML characters
    if (/[:#\[\]{}|>&*!?,]/.test(value) || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return String(value);
}

/**
 * Update frontmatter in existing content
 */
export function updateTaskFrontmatter(
  originalContent: string,
  updates: Partial<Task>
): string {
  const { data, content } = matter(originalContent, matterOptions);

  // If content field is being updated, replace the body
  const updatedContent = updates.content !== undefined ? updates.content : content;

  // Merge updates into frontmatter
  const updatedData: Record<string, unknown> = {
    ...data,
    ...updates,
    updated_at: toLocalISOString(new Date()),
  };

  // Remove non-frontmatter fields
  delete updatedData.content;
  delete updatedData.filePath;
  delete updatedData.rawContent;

  // Convert Date objects to local ISO strings
  for (const key of Object.keys(updatedData)) {
    if (updatedData[key] instanceof Date) {
      updatedData[key] = toLocalISOString(updatedData[key] as Date);
    }
  }

  // Build frontmatter manually to preserve date strings as-is
  const frontmatterLines: string[] = [];
  const fieldOrder = ['id', 'title', 'status', 'priority', 'assignee', 'created_at', 'updated_at', 'start_date', 'due_date', 'tags', 'task_size', 'total_hours', 'notion_id'];

  // Add known fields in order
  for (const key of fieldOrder) {
    if (key in updatedData && updatedData[key] !== undefined && updatedData[key] !== null) {
      frontmatterLines.push(`${key}: ${serializeYamlValue(key, updatedData[key])}`);
    }
  }

  // Add any remaining fields not in the predefined order
  for (const key of Object.keys(updatedData)) {
    if (!fieldOrder.includes(key) && updatedData[key] !== undefined && updatedData[key] !== null) {
      frontmatterLines.push(`${key}: ${serializeYamlValue(key, updatedData[key])}`);
    }
  }

  return `---\n${frontmatterLines.join('\n')}\n---\n${updatedContent}`;
}
