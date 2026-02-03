# Getting Started

Get up and running with TaskFlow in under 5 minutes.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git (optional, for version control)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/taskflow.git
cd taskflow/frontend
npm install
```

### 2. Run the Desktop App

```bash
npm run electron:dev
```

This starts the Electron desktop app with hot reload enabled.

### 3. Create Your First Task

1. Click the **+** button in the top-right corner
2. Fill in the task details:
   - **Title**: Your task name
   - **Status**: TODO (default)
   - **Priority**: HIGH, MEDIUM, or LOW
   - **Assignee**: Your name or `ai-agent` for AI automation
3. Click **Create**

Your task is now saved as a markdown file in the tasks directory.

## Understanding Task Files

Each task is a markdown file with YAML frontmatter:

```markdown
---
id: task-001
title: Implement user authentication
status: TODO
priority: HIGH
assignee: developer
created_at: 2025-01-11
tags: [backend, auth]
---

## Description

Implement JWT-based user authentication.

## Requirements

- POST /api/auth/login
- POST /api/auth/logout
- Token refresh mechanism
```

## Next Steps

- [Installation Guide](./installation.md) - Detailed setup instructions
- [Configuration](./configuration.md) - Customize TaskFlow settings
- [AI Integration](./ai-integration.md) - Set up AI automation
