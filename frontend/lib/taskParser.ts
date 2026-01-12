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

// Known section headers - only these are used as boundaries
// Can be moved to external config if needed
const SECTION_HEADERS = ['Description', 'Requirements', 'Feedback', 'AI Work Log'];

// Extract a markdown section by heading (only splits on known headers)
function extractSection(content: string, heading: string): string {
  // Build regex pattern that only matches known section headers as boundaries
  const otherHeaders = SECTION_HEADERS.filter(h => h.toLowerCase() !== heading.toLowerCase());
  const boundaryPattern = otherHeaders.map(h => `## ${h}`).join('|');

  // Handle both Unix (\n) and Windows (\r\n) line endings
  const regex = new RegExp(
    `## ${heading}[ \\t]*\\r?\\n([\\s\\S]*?)(?=\\r?\\n(?:${boundaryPattern})[ \\t]*\\r?\\n|$)`,
    'i'
  );
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

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
    description: extractSection(markdownContent, 'Description'),
    requirements: extractSection(markdownContent, 'Requirements'),
    feedback: extractSection(markdownContent, 'Feedback'),
    aiWorkLog: extractSection(markdownContent, 'AI Work Log'),
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
  };

  // Build frontmatter string with optional date fields
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

  const content = `---
${dateParts.join('\n')}
---

## Description

${task.description || ''}

## Requirements

${task.requirements || ''}

## Feedback

${task.feedback || ''}

## AI Work Log

${task.aiWorkLog || ''}
`;

  return content;
}

// Update frontmatter in existing content
export function updateTaskFrontmatter(
  originalContent: string,
  updates: Partial<Task>
): string {
  const { data, content } = matter(originalContent);

  // Handle AI Work Log update in markdown body
  let updatedContent = content;
  if (updates.aiWorkLog !== undefined) {
    // Find the AI Work Log section and update it
    const aiWorkLogRegex = /(## AI Work Log\s*\n)[\s\S]*$/;
    if (aiWorkLogRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(aiWorkLogRegex, `$1\n${updates.aiWorkLog}\n`);
    } else {
      // If section doesn't exist, append it
      updatedContent += `\n## AI Work Log\n\n${updates.aiWorkLog}\n`;
    }
  }

  // Merge updates
  const updatedData = {
    ...data,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Remove non-frontmatter fields
  delete updatedData.description;
  delete updatedData.requirements;
  delete updatedData.feedback;
  delete updatedData.aiWorkLog;
  delete updatedData.filePath;
  delete updatedData.rawContent;

  return matter.stringify(updatedContent, updatedData);
}
