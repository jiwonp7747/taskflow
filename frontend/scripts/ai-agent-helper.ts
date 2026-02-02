#!/usr/bin/env npx ts-node

/**
 * AI Agent Helper Script for TaskFlow
 *
 * Commands:
 *   list              - List all tasks assigned to ai-agent (TODO or NEED_FIX)
 *   start <id>        - Start working on a task (status -> IN_PROGRESS)
 *   complete <id> [msg] - Complete a task (status -> IN_REVIEW, add work log)
 *   show <id>         - Show task details
 *
 * Usage:
 *   npx ts-node scripts/ai-agent-helper.ts list
 *   npx ts-node scripts/ai-agent-helper.ts start task-001
 *   npx ts-node scripts/ai-agent-helper.ts complete task-001 "Implemented the feature"
 *   npx ts-node scripts/ai-agent-helper.ts show task-001
 *
 * Options:
 *   --json            - Output in JSON format
 *   --dir <path>      - Specify tasks directory (default: ./tasks)
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

// Types
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'NEED_FIX' | 'COMPLETE' | 'ON_HOLD';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  content: string;
  task_size?: string;
  total_hours?: number;
  notion_id?: string;
  filePath: string;
}

// Config
const CONFIG_FILE = '.taskflow.config.json';
const DEFAULT_TASKS_DIR = './tasks';

interface SourceConfig {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper functions
function getTasksDirectory(): string {
  // Try to read from config file
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const activeSource = config.sources?.find((s: { isActive: boolean }) => s.isActive);
      if (activeSource?.path) {
        return activeSource.path;
      }
    }
  } catch {
    // Ignore config errors
  }
  return path.join(process.cwd(), DEFAULT_TASKS_DIR);
}

function getAllSources(): SourceConfig[] {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.sources || [];
    }
  } catch {
    // Ignore config errors
  }
  return [];
}


function parseTaskFile(filePath: string): Task | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, content: markdownContent } = matter(content);

    const id = data.id || path.basename(filePath, '.md');

    return {
      id,
      title: data.title || 'Untitled',
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      assignee: data.assignee || 'user',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      tags: Array.isArray(data.tags) ? data.tags : [],
      content: markdownContent.trim(),
      task_size: data.task_size,
      total_hours: typeof data.total_hours === 'number' ? data.total_hours : undefined,
      notion_id: data.notion_id,
      filePath,
    };
  } catch (error) {
    console.error(`${colors.red}Error parsing ${filePath}:${colors.reset}`, error);
    return null;
  }
}

function getAllTasks(dir: string): Task[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const tasks: Task[] = [];

  for (const file of files) {
    const task = parseTaskFile(path.join(dir, file));
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

function getAiTasks(dir: string): Task[] {
  const tasks = getAllTasks(dir);
  return tasks.filter(
    (t) => t.assignee === 'ai-agent' && (t.status === 'TODO' || t.status === 'NEED_FIX')
  );
}

function updateTaskStatus(task: Task, newStatus: TaskStatus, workLog?: string): void {
  const content = fs.readFileSync(task.filePath, 'utf-8');
  const { data, content: markdownContent } = matter(content);

  // Update frontmatter
  data.status = newStatus;
  data.updated_at = new Date().toISOString();

  let updatedMarkdown = markdownContent;

  // Add work log if provided
  if (workLog) {
    const timestamp = new Date().toISOString().split('T')[0];
    const logEntry = `\n\n### AI Work Log - ${timestamp}\n${workLog}\n`;
    updatedMarkdown = updatedMarkdown + logEntry;
  }

  const newContent = matter.stringify(updatedMarkdown, data);
  fs.writeFileSync(task.filePath, newContent, 'utf-8');
}

function findTaskById(dir: string, id: string): Task | null {
  const tasks = getAllTasks(dir);
  return tasks.find((t) => t.id === id) || null;
}

function setActiveSource(sourceIdOrName: string): boolean {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  try {
    if (!fs.existsSync(configPath)) {
      console.error(`${colors.red}Config file not found${colors.reset}`);
      return false;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const sources: SourceConfig[] = config.sources || [];

    // Find by ID or name (case-insensitive)
    const target = sources.find(
      (s) => s.id === sourceIdOrName || s.name.toLowerCase() === sourceIdOrName.toLowerCase()
    );

    if (!target) {
      console.error(`${colors.red}Source not found: ${sourceIdOrName}${colors.reset}`);
      return false;
    }

    // Update isActive flags
    for (const source of sources) {
      source.isActive = source.id === target.id;
    }
    config.activeSourceId = target.id;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`${colors.red}Failed to update config:${colors.reset}`, error);
    return false;
  }
}

// Command handlers
function cmdList(dir: string, jsonOutput: boolean, searchAll: boolean = false): void {
  let allTasks: (Task & { sourceName?: string })[] = [];

  if (searchAll) {
    const sources = getAllSources();
    for (const source of sources) {
      if (fs.existsSync(source.path)) {
        const tasks = getAiTasks(source.path);
        allTasks.push(...tasks.map((t) => ({ ...t, sourceName: source.name })));
      }
    }
  } else {
    allTasks = getAiTasks(dir);
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ tasks: allTasks, count: allTasks.length }, null, 2));
    return;
  }

  if (allTasks.length === 0) {
    console.log(`${colors.dim}No tasks assigned to ai-agent with TODO or NEED_FIX status.${colors.reset}`);
    if (!searchAll) {
      console.log(`${colors.dim}Tip: Use --all to search all sources.${colors.reset}`);
    }
    return;
  }

  console.log(`\n${colors.cyan}${colors.bright}=== AI Agent Tasks ===${colors.reset}\n`);
  console.log(`${colors.dim}Found ${allTasks.length} task(s) to process${searchAll ? ' (all sources)' : ''}${colors.reset}\n`);

  for (const task of allTasks) {
    const statusColor = task.status === 'TODO' ? colors.yellow : colors.magenta;
    const priorityColor =
      task.priority === 'URGENT'
        ? colors.red
        : task.priority === 'HIGH'
          ? colors.yellow
          : colors.dim;

    const sourceInfo = task.sourceName ? ` ${colors.dim}[${task.sourceName}]${colors.reset}` : '';
    console.log(`${colors.bright}[${task.id}]${colors.reset} ${task.title}${sourceInfo}`);
    console.log(
      `  ${statusColor}${task.status}${colors.reset} | ${priorityColor}${task.priority}${colors.reset} | Tags: ${task.tags.join(', ') || 'none'}`
    );
    if (task.status === 'NEED_FIX' && task.content) {
      console.log(`  ${colors.magenta}Content:${colors.reset} ${task.content.slice(0, 100)}...`);
    }
    console.log('');
  }
}

function cmdShow(dir: string, taskId: string, jsonOutput: boolean): void {
  const task = findTaskById(dir, taskId);

  if (!task) {
    console.error(`${colors.red}Task not found: ${taskId}${colors.reset}`);
    process.exit(1);
  }

  if (jsonOutput) {
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  console.log(`\n${colors.cyan}${colors.bright}=== Task Details ===${colors.reset}\n`);
  console.log(`${colors.bright}ID:${colors.reset}       ${task.id}`);
  console.log(`${colors.bright}Title:${colors.reset}    ${task.title}`);
  console.log(`${colors.bright}Status:${colors.reset}   ${task.status}`);
  console.log(`${colors.bright}Priority:${colors.reset} ${task.priority}`);
  console.log(`${colors.bright}Assignee:${colors.reset} ${task.assignee}`);
  console.log(`${colors.bright}Tags:${colors.reset}     ${task.tags.join(', ') || 'none'}`);
  console.log(`${colors.bright}Updated:${colors.reset}  ${task.updated_at}`);
  console.log(`\n${colors.bright}Content:${colors.reset}\n${task.content || '(empty)'}`);
  console.log(`\n${colors.dim}File: ${task.filePath}${colors.reset}`);
}

function cmdStart(dir: string, taskId: string, jsonOutput: boolean): void {
  const task = findTaskById(dir, taskId);

  if (!task) {
    console.error(`${colors.red}Task not found: ${taskId}${colors.reset}`);
    process.exit(1);
  }

  if (task.assignee !== 'ai-agent') {
    console.error(`${colors.red}Task is not assigned to ai-agent${colors.reset}`);
    process.exit(1);
  }

  if (task.status !== 'TODO' && task.status !== 'NEED_FIX') {
    console.error(
      `${colors.red}Task status must be TODO or NEED_FIX to start (current: ${task.status})${colors.reset}`
    );
    process.exit(1);
  }

  updateTaskStatus(task, 'IN_PROGRESS', 'Started working on this task.');

  if (jsonOutput) {
    console.log(JSON.stringify({ success: true, taskId, newStatus: 'IN_PROGRESS' }));
    return;
  }

  console.log(
    `${colors.green}${colors.bright}Started task:${colors.reset} ${task.id} - ${task.title}`
  );
  console.log(`${colors.dim}Status changed: ${task.status} -> IN_PROGRESS${colors.reset}`);
}

function cmdComplete(dir: string, taskId: string, message: string, jsonOutput: boolean): void {
  const task = findTaskById(dir, taskId);

  if (!task) {
    console.error(`${colors.red}Task not found: ${taskId}${colors.reset}`);
    process.exit(1);
  }

  if (task.status !== 'IN_PROGRESS') {
    console.error(
      `${colors.red}Task must be IN_PROGRESS to complete (current: ${task.status})${colors.reset}`
    );
    process.exit(1);
  }

  const logMessage = message || 'Completed the task.';
  updateTaskStatus(task, 'IN_REVIEW', logMessage);

  if (jsonOutput) {
    console.log(JSON.stringify({ success: true, taskId, newStatus: 'IN_REVIEW', message: logMessage }));
    return;
  }

  console.log(
    `${colors.green}${colors.bright}Completed task:${colors.reset} ${task.id} - ${task.title}`
  );
  console.log(`${colors.dim}Status changed: IN_PROGRESS -> IN_REVIEW${colors.reset}`);
  console.log(`${colors.dim}Work log added: ${logMessage}${colors.reset}`);
}

function cmdSources(jsonOutput: boolean): void {
  const sources = getAllSources();

  if (jsonOutput) {
    console.log(JSON.stringify({ sources }, null, 2));
    return;
  }

  if (sources.length === 0) {
    console.log(`${colors.dim}No sources configured.${colors.reset}`);
    return;
  }

  console.log(`\n${colors.cyan}${colors.bright}=== Sources ===${colors.reset}\n`);

  for (const source of sources) {
    const activeMarker = source.isActive ? `${colors.green}● ` : '  ';
    const activeLabel = source.isActive ? ` ${colors.green}(active)${colors.reset}` : '';
    console.log(`${activeMarker}${colors.bright}${source.name}${colors.reset}${activeLabel}`);
    console.log(`  ${colors.dim}${source.path}${colors.reset}`);
    console.log('');
  }
}

function cmdUse(sourceIdOrName: string, jsonOutput: boolean): void {
  if (!sourceIdOrName) {
    console.error(`${colors.red}Usage: use <source-name>${colors.reset}`);
    process.exit(1);
  }

  const success = setActiveSource(sourceIdOrName);

  if (success) {
    const sources = getAllSources();
    const active = sources.find((s) => s.isActive);

    if (jsonOutput) {
      console.log(JSON.stringify({ success: true, activeSource: active }));
      return;
    }

    console.log(`${colors.green}${colors.bright}Switched to:${colors.reset} ${active?.name}`);
    console.log(`${colors.dim}Path: ${active?.path}${colors.reset}`);
  } else {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false }));
    }
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
${colors.cyan}${colors.bright}TaskFlow AI Agent Helper${colors.reset}

${colors.bright}Commands:${colors.reset}
  list              List all tasks assigned to ai-agent (TODO or NEED_FIX)
  start <id>        Start working on a task (status -> IN_PROGRESS)
  complete <id> [msg]  Complete a task (status -> IN_REVIEW, add work log)
  show <id>         Show task details
  sources           List all configured sources
  use <name>        Switch active source

${colors.bright}Options:${colors.reset}
  --json            Output in JSON format
  --all             Search all sources (for list command)
  --dir <path>      Specify tasks directory

${colors.bright}Examples:${colors.reset}
  npm run ai -- list
  npm run ai -- list --all
  npm run ai -- sources
  npm run ai -- use todo
  npm run ai -- start task-001
  npm run ai -- complete task-001 "Implemented user auth"
  npm run ai -- show task-001
`);
}

// Main
function main(): void {
  const args = process.argv.slice(2);

  // Parse options
  const jsonOutput = args.includes('--json');
  const searchAll = args.includes('--all');
  const dirIndex = args.indexOf('--dir');
  let tasksDir = getTasksDirectory();

  if (dirIndex !== -1 && args[dirIndex + 1]) {
    tasksDir = args[dirIndex + 1];
    args.splice(dirIndex, 2);
  }

  // Remove options from args
  const filteredArgs = args.filter((a) => !a.startsWith('--'));
  const command = filteredArgs[0];

  switch (command) {
    case 'list':
      cmdList(tasksDir, jsonOutput, searchAll);
      break;
    case 'show':
      if (!filteredArgs[1]) {
        console.error(`${colors.red}Usage: show <task-id>${colors.reset}`);
        process.exit(1);
      }
      cmdShow(tasksDir, filteredArgs[1], jsonOutput);
      break;
    case 'start':
      if (!filteredArgs[1]) {
        console.error(`${colors.red}Usage: start <task-id>${colors.reset}`);
        process.exit(1);
      }
      cmdStart(tasksDir, filteredArgs[1], jsonOutput);
      break;
    case 'complete':
      if (!filteredArgs[1]) {
        console.error(`${colors.red}Usage: complete <task-id> [message]${colors.reset}`);
        process.exit(1);
      }
      cmdComplete(tasksDir, filteredArgs[1], filteredArgs.slice(2).join(' '), jsonOutput);
      break;
    case 'sources':
      cmdSources(jsonOutput);
      break;
    case 'use':
      cmdUse(filteredArgs[1], jsonOutput);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      printHelp();
      if (command) {
        console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
      }
      process.exit(command ? 1 : 0);
  }
}

main();
