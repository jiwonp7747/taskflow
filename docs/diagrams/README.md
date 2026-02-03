# TaskFlow Architecture Diagrams

> Generated: 2026-01-13
> Tool: diagram_mcp (Python Diagrams library)

## Diagrams

### 1. System Overview
![System Overview](./system-overview.png)

**Description**: Complete TaskFlow system architecture
- Frontend: Next.js 16 + React 19
- Core: Hexagonal Architecture based
- Persistence: File System (Markdown) + SQLite
- AI Integration: Claude Code CLI

---

### 2. Hexagonal Architecture
![Hexagonal Architecture](./hexagonal-architecture.png)

**Description**: Clean Architecture (Hexagonal) structure
- **Driving Adapters**: API Routes, React Hooks
- **Application Core**: Services, Domain Entities, Ports
- **Driven Adapters**: File Repository, SQLite Repository

---

### 3. AI Worker Flow
![AI Worker Flow](./ai-worker-flow.png)

**Description**: AI Worker task processing flow
1. File Watcher detects Markdown file changes
2. Task Parser parses tasks (gray-matter)
3. Eligible tasks (assignee: ai-agent, status: TODO) added to queue
4. AI Worker pulls tasks from queue and executes
5. Claude Executor calls Claude Code CLI
6. Results updated in Markdown file
7. Real-time broadcast via WebSocket

---

### 4. Frontend Components
![Frontend Components](./frontend-components.png)

**Description**: React component structure
- **Kanban Board**: TaskBoard, TaskColumn, TaskCard, TaskSidebar
- **AI Panel**: AIStatusBar, ConversationPanel
- **Sidebar**: LeftSidebar, SourcePanel
- **Hooks**: useTasks, useConfig, useAIWorker, useTaskFilter

---

### 5. API Routes
![API Routes](./api-routes.png)

**Description**: Next.js API route structure
- `/api/tasks/*`: Task CRUD operations
- `/api/config/*`: Configuration management
- `/api/ai/*`: AI Worker control (start, stop, pause, resume, status)
- `/api/watch`: File change SSE stream

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS 4 |
| State | React Hooks, SSE (Server-Sent Events) |
| Persistence | File System (Markdown), SQLite (better-sqlite3) |
| AI | Claude Code CLI |
| DnD | @dnd-kit/core, @dnd-kit/sortable |
| Parser | gray-matter (Markdown frontmatter) |
| Watcher | chokidar |

## Directory Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   └── page.tsx           # Main page
├── components/            # React Components
│   ├── kanban/           # Kanban board
│   ├── ai/               # AI integration
│   ├── sidebar/          # Navigation
│   └── ui/               # Common UI
├── core/                  # Hexagonal Core
│   ├── domain/           # Entities
│   ├── ports/            # Interfaces
│   └── application/      # Services
├── adapters/             # Infrastructure
│   └── persistence/      # Repositories
├── hooks/                # React Hooks
├── lib/                  # Utilities
└── infrastructure/       # DI Container
```
