# Contributing

Thank you for your interest in contributing to TaskFlow!

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- Code editor (VS Code recommended)

### Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow/frontend

# Install dependencies
npm install

# Start development server
npm run electron:dev
```

## Development Workflow

### Branch Naming

```
feature/description    # New features
fix/description        # Bug fixes
docs/description       # Documentation
refactor/description   # Code refactoring
```

### Commit Messages

Follow conventional commits:

```
feat: add calendar view filtering
fix: resolve drag-drop issue on Windows
docs: update AI integration guide
refactor: simplify task parser logic
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests if applicable
4. Ensure all tests pass: `npm test`
5. Update documentation if needed
6. Submit PR with clear description

## Project Structure

```
frontend/
├── electron/           # Electron main process
│   ├── main.ts         # App entry point
│   ├── preload.ts      # Security bridge
│   ├── ipc/            # IPC handlers
│   ├── services/       # Background services
│   └── lib/            # Utilities
├── src/                # Electron renderer (React)
│   ├── App.tsx         # Root component
│   ├── components/     # React components
│   └── hooks/          # Custom hooks
├── app/                # Next.js web app
│   ├── page.tsx        # Web UI
│   └── api/            # API routes
└── shared/             # Shared code
    ├── components/     # Cross-runtime components
    ├── hooks/          # Cross-runtime hooks
    └── types/          # TypeScript types
```

## Code Style

### TypeScript

- Use strict TypeScript
- Prefer interfaces over types for objects
- Document public APIs with JSDoc

### React

- Use functional components with hooks
- Keep components small and focused
- Use custom hooks for shared logic

### Styling

- Use Tailwind CSS utility classes
- Follow existing patterns in the codebase
- Avoid inline styles

## Testing

### Running Tests

```bash
# Unit tests
npm test

# E2E tests (Playwright)
npm run test:e2e

# Type checking
npm run typecheck
```

### Writing Tests

- Place tests next to source files or in `__tests__/`
- Use descriptive test names
- Test behavior, not implementation

## Areas for Contribution

### Good First Issues

Look for issues labeled `good-first-issue`:

- Documentation improvements
- UI polish and accessibility
- Bug fixes with clear reproduction steps

### Feature Ideas

- Additional calendar views
- Task templates
- Keyboard shortcuts
- Mobile responsive improvements
- Plugin system

### Documentation

- Improve existing guides
- Add examples and tutorials
- Translate to other languages

## Code of Conduct

### Be Respectful

- Treat everyone with respect
- Welcome newcomers
- Accept constructive criticism

### Be Collaborative

- Share knowledge
- Help others learn
- Credit contributors

## Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and community chat
- **Discord**: Real-time chat (if available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
