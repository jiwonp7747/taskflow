# TaskFlow

A local-first, markdown-based task management system with AI automation.

---

## Overview

**TaskFlow** uses markdown files as the source of truth for task management. Each task exists as an individual `.md` file with YAML frontmatter for metadata. It works completely offline without cloud dependency, supports Git version control, and allows AI agents to directly manipulate files.

### Core Philosophy

**Files are the truth.** Tasks exist as markdown files on disk, enabling Git version control, offline work, and cloud-free AI agent manipulation.

### Key Features

- **Kanban Board** - Drag-and-drop board with 6 columns: TODO, IN_PROGRESS, IN_REVIEW, NEED_FIX, COMPLETE, ON_HOLD
- **Calendar View** - Monthly calendar with date-based task visualization
- **Timeline View** - Hourly daily timeline, accessible by double-clicking calendar dates
- **AI Worker** - Auto-execute tasks assigned to `ai-agent` via Claude Code CLI with automatic status updates
- **Real-time File Sync** - chokidar monitors source directories for immediate external change reflection
- **Multi-source** - Manage multiple task directories, one active at a time
- **Built-in Terminal** - Full PTY terminal with split panes and tabs (xterm.js + node-pty)
- **Task Filtering** - Filter by tags, assignee, and date range
- **AI Conversations** - Chat with AI about specific tasks in the sidebar
- **CLI Tools** - Terminal-based task management via `npm run ai` commands
- **Cross-platform** - macOS DMG, Windows NSIS, Linux AppImage

---

## Badges

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)

---

## Dual Runtime

TaskFlow provides two runtime environments:

### Electron Desktop App (Primary)

Full-featured desktop application with SQLite, built-in terminal, system tray, and native menus.

### Next.js Web App (Secondary)

Browser-based version using HTTP API routes and SSE.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Runtime | Electron 35 |
| Web Runtime | Next.js 16 (App Router) |
| Frontend | React 19, TypeScript 5 |
| Build (Electron) | Vite 6 + vite-plugin-electron |
| Styling | Tailwind CSS 4 |
| Drag & Drop | @dnd-kit |
| Database | better-sqlite3 (Electron), JSON files (Web) |
| Markdown Parsing | gray-matter |
| File Watching | chokidar 5 |
| Terminal | xterm.js 5, node-pty |
| Testing | Playwright |
| Packaging | electron-builder |
| AI | Claude Code CLI |

---

## Project Structure

```
taskflow/
├── frontend/                 # Main application
│   ├── electron/             # Electron main process
│   │   ├── main.ts           # App entry point
│   │   ├── preload.ts        # Security bridge (context isolation)
│   │   ├── ipc/              # IPC handlers (tasks, config, sources, ai, terminal, dialog, window)
│   │   ├── services/         # Background services (database, fileWatcher, aiWorker, claudeExecutor, pty)
│   │   └── lib/              # Utilities (taskParser, fileSystem)
│   ├── src/                  # Electron renderer (React)
│   │   ├── App.tsx           # Root component
│   │   ├── components/       # TitleBar, Terminal
│   │   └── hooks/            # IPC-based hooks
│   ├── app/                  # Next.js web app
│   │   ├── page.tsx          # Web UI
│   │   └── api/              # REST API routes
│   ├── components/           # Shared UI components
│   │   ├── kanban/           # TaskBoard, TaskCard, TaskColumn, TaskSidebar, FilterBar
│   │   ├── calendar/         # CalendarView, CalendarDayCell, CalendarWeekRow
│   │   ├── timeline/         # TimelineView, TimelineGrid, TimelineBlock
│   │   ├── sidebar/          # LeftSidebar, SourcePanel
│   │   ├── ai/               # AIStatusBar, ConversationPanel
│   │   └── onboarding/       # WelcomeScreen
│   ├── core/                 # Hexagonal architecture domain
│   │   ├── domain/entities/  # Source, Config, AIWorkerConfig
│   │   ├── ports/            # Input/Output interfaces
│   │   └── application/      # Service implementations
│   ├── adapters/             # Persistence adapters (File, SQLite)
│   ├── infrastructure/       # DI container, factories
│   ├── types/                # Shared TypeScript types
│   └── scripts/              # CLI tools (ai-agent-helper)
└── docs/                     # Documentation
    ├── README.md             # Documentation index
    ├── getting-started.md    # Quick start guide
    ├── installation.md       # Installation instructions
    ├── configuration.md      # Configuration options
    ├── architecture.md       # System architecture
    ├── ai-integration.md     # AI agent integration guide
    ├── contributing.md       # Contribution guide
    └── diagrams/             # Architecture diagrams
```

---

## Installation

### Prerequisites

- Node.js 18 or higher
- Claude Code CLI (for AI worker): verify with `claude --version`

### Install

```bash
cd frontend
npm install
```

### Development

```bash
# Electron desktop app (primary)
npm run dev

# Next.js web app (secondary)
npm run dev:next
```

### Build

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

### First Run

On first launch, a welcome screen will guide you to set up a "source" - a local directory where your markdown task files will be stored.

---

## Task File Format

Each task is a `.md` file with YAML frontmatter:

```markdown
---
id: task-001
title: Implement user authentication API
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
```

### Status Values

| Status | Description |
|--------|-------------|
| `TODO` | Not started |
| `IN_PROGRESS` | Currently working |
| `IN_REVIEW` | Awaiting review |
| `NEED_FIX` | Requires changes |
| `COMPLETE` | Done |
| `ON_HOLD` | Paused |

### Priority Values

| Priority | Description |
|----------|-------------|
| `LOW` | Low priority |
| `MEDIUM` | Normal priority |
| `HIGH` | High priority |
| `URGENT` | Urgent |

---

## AI Worker

The AI Worker polls for tasks with `assignee: ai-agent` and `status: TODO` or `NEED_FIX`, then automatically executes them via Claude Code CLI.

### Execution Flow

```
TODO → IN_PROGRESS → (Claude Code execution) → IN_REVIEW (success) or NEED_FIX (failure)
```

### Controls

Control the AI Worker via the AI status bar at the bottom of the app.

### Configuration

Configure in `.taskflow.config.json`:

```json
{
  "aiWorker": {
    "enabled": true,
    "autoStart": false,
    "pollingInterval": 30000,
    "maxConcurrent": 1,
    "timeout": 600000
  }
}
```

| Option | Description |
|--------|-------------|
| `enabled` | Enable AI Worker |
| `autoStart` | Auto-start on app launch |
| `pollingInterval` | Polling interval (ms) |
| `maxConcurrent` | Max concurrent tasks |
| `timeout` | Task execution timeout (ms) |

---

## CLI Tools

Manage tasks from the terminal:

```bash
# List AI-assigned tasks
npm run ai:list

# Start a task (→ IN_PROGRESS)
npm run ai:start <task-id>

# Complete a task (→ IN_REVIEW)
npm run ai -- complete <task-id> "work description"

# View task details
npm run ai -- show <task-id>
```

---

## Documentation

- [Getting Started](./docs/getting-started.md) - Quick start guide
- [Installation](./docs/installation.md) - Detailed installation
- [Configuration](./docs/configuration.md) - Configuration options
- [Architecture](./docs/architecture.md) - System architecture
- [AI Integration](./docs/ai-integration.md) - AI agent guide
- [Contributing](./docs/contributing.md) - How to contribute
- [Diagrams](./docs/diagrams/) - Architecture diagrams

---

## License

MIT - See [LICENSE](./LICENSE) for details.

### Third-Party Licenses

This project uses the following notable dependencies:
- **sharp** (image processing): Uses `libvips` which is licensed under LGPL-3.0. As a dynamically linked library, this does not affect the license of this project.

---

## Contributing

Issues and pull requests are welcome. See [Contributing Guide](./docs/contributing.md).

---

## Links

- [GitHub Repository](https://github.com/jiwonp7747/taskflow)
- [Issue Tracker](https://github.com/jiwonp7747/taskflow/issues)
- [Documentation](./docs/README.md)
