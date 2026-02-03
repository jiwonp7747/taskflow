# Architecture

Overview of TaskFlow's system architecture.

## Design Philosophy

TaskFlow follows the **"Files as Source of Truth"** principle:

- Tasks exist as markdown files on disk
- The UI reflects file state, not the other way around
- External changes (Git, AI, editors) are immediately reflected
- No database lock-in; your data is always portable

## Dual Runtime

TaskFlow supports two runtime environments:

```
┌─────────────────────────────────────────────────────────────┐
│                      TaskFlow                                │
├──────────────────────────┬──────────────────────────────────┤
│   Electron Desktop App   │      Next.js Web App             │
│   (Primary)              │      (Secondary)                 │
├──────────────────────────┼──────────────────────────────────┤
│ - SQLite database        │ - JSON file storage              │
│ - Native terminal (PTY)  │ - HTTP API routes                │
│ - System tray            │ - SSE for real-time updates      │
│ - Native menus           │ - Browser-based                  │
│ - File system access     │ - Cross-platform web access      │
└──────────────────────────┴──────────────────────────────────┘
```

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (React)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Kanban Board│  │ Calendar    │  │ Terminal            │  │
│  │ (dnd-kit)   │  │ View        │  │ (xterm.js)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                         │                                    │
│                    [IPC Bridge]                              │
│                    (preload.ts)                              │
└─────────────────────────│────────────────────────────────────┘
                          │
┌─────────────────────────│────────────────────────────────────┐
│                    Main Process                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ IPC Handlers│  │ Services    │  │ File System         │  │
│  │ - tasks     │  │ - database  │  │ - taskParser        │  │
│  │ - config    │  │ - aiWorker  │  │ - fileWatcher       │  │
│  │ - terminal  │  │ - pty       │  │ - gray-matter       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    File System                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ tasks/*.md  │  │ .taskflow   │  │ SQLite DB           │  │
│  │ (source of  │  │ .config.json│  │ (cache/metadata)    │  │
│  │  truth)     │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Task Parser

Parses markdown files with YAML frontmatter using `gray-matter`:

```typescript
// Input: task file content
// Output: { data: frontmatter, content: markdown body }
```

### File Watcher

Uses `chokidar` to monitor task directories:

- Detects add/change/delete events
- Triggers UI updates via IPC
- Handles external modifications (Git, AI, editors)

### AI Worker

Background service that processes AI-assigned tasks:

```
1. Poll for tasks with assignee: ai-agent, status: TODO
2. Start task (status → IN_PROGRESS)
3. Execute Claude Code CLI with task context
4. Complete task (status → IN_REVIEW)
5. Repeat
```

### Terminal Service

Full PTY terminal using `node-pty` and `xterm.js`:

- Multiple terminal tabs
- Split panes
- Persistent sessions
- Shell integration

## Data Flow

### Creating a Task

```
User clicks "+" → React form → IPC: tasks:create
                                    │
                                    ▼
                              Main Process
                              creates .md file
                                    │
                                    ▼
                              File Watcher
                              detects change
                                    │
                                    ▼
                              IPC: tasks:updated
                                    │
                                    ▼
                              UI updates
```

### AI Task Execution

```
Task with assignee: ai-agent, status: TODO
              │
              ▼
        AI Worker detects
              │
              ▼
        Update status → IN_PROGRESS
              │
              ▼
        Claude Code CLI executes
              │
              ▼
        Update status → IN_REVIEW
        Add work log to file
              │
              ▼
        User reviews and approves
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop Runtime | Electron 35 |
| Web Runtime | Next.js 16 (App Router) |
| Frontend | React 19, TypeScript 5 |
| Build (Electron) | Vite 6 + vite-plugin-electron |
| Styling | Tailwind CSS 4 |
| Drag & Drop | @dnd-kit |
| Database | better-sqlite3 (Electron), JSON (Web) |
| Markdown | gray-matter |
| File Watching | chokidar 5 |
| Terminal | xterm.js 5, node-pty |
| Testing | Playwright |
| Packaging | electron-builder |
| AI | Claude Code CLI |

## Security Model

### Context Isolation

Electron uses context isolation with a preload script:

```typescript
// preload.ts exposes safe APIs
contextBridge.exposeInMainWorld('electronAPI', {
  tasks: { ... },
  config: { ... },
  terminal: { ... }
});
```

### File Access

- Only configured source directories are accessible
- No arbitrary file system access from renderer
- All file operations go through IPC handlers

## Next Steps

- [AI Integration](./ai-integration.md) - How AI agents interact with TaskFlow
- [Contributing](./contributing.md) - Contribute to the architecture
