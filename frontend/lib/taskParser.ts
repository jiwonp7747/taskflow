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

// Extract a markdown section by heading
function extractSection(content: string, heading: string): string {
  const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
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

// Parse date string
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
    tags: task.tags || [],
  };

  const content = `---
id: ${frontmatter.id}
title: ${frontmatter.title}
status: ${frontmatter.status}
priority: ${frontmatter.priority}
assignee: ${frontmatter.assignee}
created_at: ${frontmatter.created_at}
updated_at: ${frontmatter.updated_at}
tags: [${frontmatter.tags.join(', ')}]
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
