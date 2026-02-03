# TaskFlow Documentation

Welcome to TaskFlow documentation. TaskFlow is a local-first, markdown-based task management system with AI automation.

## Quick Links

| Document | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Quick start guide for new users |
| [Installation](./installation.md) | Detailed installation instructions |
| [Configuration](./configuration.md) | Configuration options and settings |
| [Architecture](./architecture.md) | System architecture overview |
| [AI Integration](./ai-integration.md) | Guide for AI agents (Claude Code, etc.) |
| [Contributing](./contributing.md) | How to contribute to TaskFlow |

## What is TaskFlow?

TaskFlow uses markdown files as the source of truth for task management. Each task exists as an individual `.md` file with YAML frontmatter for metadata. This approach enables:

- **Offline-first**: No cloud dependency, works completely offline
- **Git-friendly**: Version control your tasks like code
- **AI-native**: AI agents can directly read and modify task files
- **Portable**: Your data is just markdown files

## Core Features

- **Kanban Board** - 6-column drag-and-drop board (TODO, IN_PROGRESS, IN_REVIEW, NEED_FIX, COMPLETE, ON_HOLD)
- **Calendar View** - Monthly calendar with task visualization
- **Timeline View** - Daily hourly timeline
- **AI Worker** - Auto-execute tasks assigned to `ai-agent` via Claude Code CLI
- **Real-time Sync** - File watcher reflects external changes immediately
- **Built-in Terminal** - Full PTY terminal with split panes and tabs
- **Cross-platform** - macOS, Windows, Linux support

## Getting Help

- [GitHub Issues](https://github.com/your-org/taskflow/issues) - Bug reports and feature requests
- [Discussions](https://github.com/your-org/taskflow/discussions) - Questions and community chat
