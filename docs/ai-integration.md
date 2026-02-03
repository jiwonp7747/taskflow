# AI Integration

Guide for integrating AI agents (Claude Code, etc.) with TaskFlow.

## Overview

TaskFlow is designed for seamless AI agent integration. AI agents can:

- Read task files directly from the file system
- Modify task metadata (status, work logs)
- Use CLI helper scripts for common operations

## AI Agent Workflow

```
1. User creates task (assignee: ai-agent, status: TODO)
2. AI agent queries task list
3. AI agent starts work (status → IN_PROGRESS)
4. AI agent performs the task
5. AI agent completes (status → IN_REVIEW + work log)
6. User reviews: COMPLETE or NEED_FIX
7. If NEED_FIX: AI agent reads feedback and iterates
```

## Method 1: CLI Helper Scripts (Recommended)

### Setup

```bash
cd /path/to/taskflow/frontend
npm install
```

### Commands

#### List AI Tasks

Get tasks assigned to AI agent (status: TODO or NEED_FIX):

```bash
npm run ai:list
```

JSON output:

```bash
npm run ai -- list --json
```

#### View Task Details

```bash
npm run ai -- show <task-id>
```

Example:

```bash
npm run ai -- show task-001
```

#### Start Working

Change status to IN_PROGRESS:

```bash
npm run ai:start <task-id>
```

Example:

```bash
npm run ai -- start task-001
```

#### Complete Task

Change status to IN_REVIEW and add work log:

```bash
npm run ai -- complete <task-id> "Work description"
```

Example:

```bash
npm run ai -- complete task-001 "Implemented JWT authentication with refresh tokens"
```

### CLI Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |
| `--dir <path>` | Specify task directory |

## Method 2: Direct File Modification

AI agents can directly read and modify markdown files.

### Task File Structure

```markdown
---
id: task-001
title: Implement user authentication
status: TODO
priority: HIGH
assignee: ai-agent
created_at: 2025-01-11
updated_at: 2025-01-11
tags: [backend, auth, api]
---

## Description

Task details here...

## Requirements

- Requirement 1
- Requirement 2

## Feedback

(User feedback when status is NEED_FIX)

## AI Work Log

(AI agent records work here)
```

### Status Values

| Status | Description | AI Agent Role |
|--------|-------------|---------------|
| `TODO` | Pending | Detect as work target |
| `IN_PROGRESS` | Working | Set when starting |
| `IN_REVIEW` | Awaiting review | Set when completing |
| `NEED_FIX` | Needs changes | Read feedback, rework |
| `COMPLETE` | Done | - |
| `ON_HOLD` | Paused | - |

### Starting a Task

Update frontmatter:

```yaml
status: IN_PROGRESS
updated_at: 2025-01-11T10:00:00.000Z
```

### Completing a Task

1. Update frontmatter:

```yaml
status: IN_REVIEW
updated_at: 2025-01-11T11:00:00.000Z
```

2. Add work log:

```markdown
## AI Work Log

### 2025-01-11
- Implemented JWT authentication
- Added login/logout endpoints
- Created middleware for token validation
```

## Claude Code Examples

### Example 1: Query and Execute Task

```
User: Check TaskFlow for my assignments and work on them

Claude: Let me check your assigned tasks.

[Run: npm run ai:list]

Found task-001. Starting work.

[Run: npm run ai -- start task-001]

Now implementing the requirements...
(implementation work)

Work complete.

[Run: npm run ai -- complete task-001 "Implemented the requested feature"]
```

### Example 2: Handle NEED_FIX Feedback

```
User: Check feedback and fix the issues

Claude: Let me check tasks needing fixes.

[Run: npm run ai:list]

task-002 has NEED_FIX status. Checking feedback.

[Run: npm run ai -- show task-002]

Feedback: "Error handling is insufficient. Add try-catch blocks."

Starting fixes.

[Run: npm run ai -- start task-002]

(code modifications)

Fixes complete.

[Run: npm run ai -- complete task-002 "Added comprehensive error handling"]
```

## Configuring Task Directory

Default directory: `frontend/tasks/`

To use a different directory:

1. Add a source via UI (sidebar folder icon)
2. Or use `--dir` option:

```bash
npm run ai -- list --dir /path/to/your/tasks
```

## Best Practices

1. **Always run `start` before working** - Prevents conflicts with other workers
2. **Write meaningful work logs** - Helps reviewers understand changes
3. **Check NEED_FIX feedback carefully** - Read the `## Feedback` section
4. **Maintain YAML syntax** - Invalid frontmatter breaks parsing
5. **Update `updated_at` timestamp** - Keeps file metadata accurate

## Troubleshooting

### Tasks Not Appearing in List

- Verify `assignee` is `ai-agent`
- Verify `status` is `TODO` or `NEED_FIX`
- Check task directory path

### Status Changes Not Working

- Check file permissions
- Validate YAML frontmatter syntax

### UI Not Reflecting Changes

- Ensure TaskFlow app is running (`npm run electron:dev`)
- Verify file was saved correctly

## Next Steps

- [Configuration](./configuration.md) - Configure AI Worker settings
- [Architecture](./architecture.md) - Understand the system design
