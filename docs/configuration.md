# Configuration

Customize TaskFlow to fit your workflow.

## Configuration File

TaskFlow stores configuration in `.taskflow.config.json` in your project root:

```json
{
  "sources": [
    {
      "id": "default",
      "name": "My Tasks",
      "path": "./tasks",
      "active": true
    }
  ],
  "theme": "system",
  "aiWorker": {
    "enabled": false,
    "autoStart": false
  }
}
```

## Task Sources

TaskFlow supports multiple task directories (sources). Only one source is active at a time.

### Adding a Source

1. Click the folder icon in the sidebar
2. Click **Add Source**
3. Select a directory containing markdown task files
4. Give it a name

### Source Configuration

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name |
| `path` | string | Directory path (relative or absolute) |
| `active` | boolean | Whether this source is currently active |

## Theme Settings

TaskFlow supports three theme modes:

| Value | Description |
|-------|-------------|
| `light` | Always use light theme |
| `dark` | Always use dark theme |
| `system` | Follow system preference |

Change theme via **Settings > Appearance** or in the config file.

## AI Worker Configuration

The AI Worker automatically processes tasks assigned to `ai-agent`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable AI Worker |
| `autoStart` | boolean | `false` | Start worker on app launch |
| `claudePath` | string | `claude` | Path to Claude Code CLI |
| `maxConcurrent` | number | `1` | Max concurrent AI tasks |

### Enabling AI Worker

1. Install [Claude Code CLI](https://github.com/anthropics/claude-code)
2. Enable in config:

```json
{
  "aiWorker": {
    "enabled": true,
    "autoStart": true
  }
}
```

3. Assign tasks to `ai-agent` to trigger automation

## Task File Structure

### Required Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique task identifier |
| `title` | string | Task title |
| `status` | string | Current status |

### Optional Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `priority` | string | HIGH, MEDIUM, LOW |
| `assignee` | string | Person or `ai-agent` |
| `created_at` | string | ISO date |
| `updated_at` | string | ISO date |
| `due_date` | string | ISO date |
| `tags` | array | List of tags |
| `start_time` | string | For timeline view (HH:mm) |
| `end_time` | string | For timeline view (HH:mm) |

### Status Values

| Status | Description | Color |
|--------|-------------|-------|
| `TODO` | Not started | Gray |
| `IN_PROGRESS` | Currently working | Blue |
| `IN_REVIEW` | Awaiting review | Yellow |
| `NEED_FIX` | Requires changes | Red |
| `COMPLETE` | Done | Green |
| `ON_HOLD` | Paused | Purple |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TASKFLOW_CONFIG_PATH` | Override config file location |
| `TASKFLOW_DEBUG` | Enable debug logging |

## Next Steps

- [AI Integration](./ai-integration.md) - Configure AI automation
- [Architecture](./architecture.md) - Understand how TaskFlow works
