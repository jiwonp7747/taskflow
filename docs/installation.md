# Installation

Detailed installation guide for TaskFlow.

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.x | 20.x or later |
| RAM | 4 GB | 8 GB |
| Disk | 500 MB | 1 GB |
| OS | macOS 12+, Windows 10+, Ubuntu 20.04+ | Latest stable |

## Installation Methods

### Method 1: From Source (Development)

```bash
# Clone the repository
git clone https://github.com/your-org/taskflow.git
cd taskflow/frontend

# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

### Method 2: Pre-built Binaries (Production)

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `TaskFlow-x.x.x-arm64.dmg` |
| macOS (Intel) | `TaskFlow-x.x.x-x64.dmg` |
| Windows | `TaskFlow-x.x.x-setup.exe` |
| Linux | `TaskFlow-x.x.x.AppImage` |

### Method 3: Web Version

If you prefer browser-based access:

```bash
cd taskflow/frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Building from Source

### Desktop App (Electron)

```bash
# Development build
npm run electron:build

# Production build
npm run electron:build:prod
```

Build outputs are in `frontend/dist-electron/`.

### Platform-specific Builds

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

## Verifying Installation

1. Launch TaskFlow
2. You should see the Kanban board with sample columns
3. Click **+** to create a test task
4. Verify the task appears in the TODO column

## Troubleshooting

### Node.js Version Issues

```bash
# Check Node.js version
node --version

# Use nvm to install correct version
nvm install 20
nvm use 20
```

### Native Module Errors (Electron)

```bash
# Rebuild native modules
npm run electron:rebuild
```

### Permission Errors (Linux)

```bash
# Make AppImage executable
chmod +x TaskFlow-x.x.x.AppImage
```

## Next Steps

- [Configuration](./configuration.md) - Customize your setup
- [Getting Started](./getting-started.md) - Create your first task
