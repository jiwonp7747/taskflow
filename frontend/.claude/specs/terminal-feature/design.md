# Terminal Feature - Design Document

## Overview

**Feature Name**: Integrated Terminal
**Version**: 1.0
**Created**: 2026-01-15
**Status**: Draft

---

## Architecture Overview

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron App                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Main Process                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ PTY Service │  │ Terminal IPC│  │ Window IPC  │     │   │
│  │  │  (node-pty) │  │  Handlers   │  │  Handlers   │     │   │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────┘     │   │
│  │         │                │                               │   │
│  │         │    IPC Bridge  │                               │   │
│  └─────────┼────────────────┼───────────────────────────────┘   │
│            │                │                                    │
│  ┌─────────┼────────────────┼───────────────────────────────┐   │
│  │         ▼                ▼      Renderer Process         │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              React Application                   │    │   │
│  │  │  ┌──────────┐  ┌──────────────────────────────┐ │    │   │
│  │  │  │ App.tsx  │  │     TerminalView.tsx         │ │    │   │
│  │  │  │ (Mode    │  │  ┌────────────────────────┐  │ │    │   │
│  │  │  │  Toggle) │  │  │   TerminalTabBar.tsx   │  │ │    │   │
│  │  │  └──────────┘  │  ├────────────────────────┤  │ │    │   │
│  │  │                │  │   SplitContainer.tsx   │  │ │    │   │
│  │  │                │  │  ┌──────┐  ┌──────┐    │  │ │    │   │
│  │  │                │  │  │Pane 1│  │Pane 2│    │  │ │    │   │
│  │  │                │  │  │xterm │  │xterm │    │  │ │    │   │
│  │  │                │  │  └──────┘  └──────┘    │  │ │    │   │
│  │  │                │  └────────────────────────┘  │ │    │   │
│  │  │                └──────────────────────────────┘ │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

```
src/
├── components/
│   └── terminal/
│       ├── index.ts                 # Public exports
│       ├── TerminalView.tsx         # 터미널 모드 메인 컨테이너
│       ├── TerminalTabBar.tsx       # 탭 바 UI
│       ├── TerminalTab.tsx          # 개별 탭 컴포넌트
│       ├── TerminalPane.tsx         # xterm.js 래퍼
│       ├── SplitContainer.tsx       # 분할 레이아웃 관리
│       ├── SplitContextMenu.tsx     # Split 드롭다운 메뉴
│       └── types.ts                 # 터미널 관련 타입 정의
├── hooks/
│   ├── useTerminal.ts               # 터미널 상태 관리
│   ├── useTerminalTabs.ts           # 탭 관리 로직
│   └── usePty.ts                    # PTY IPC 통신
└── lib/
    └── terminalIpc.ts               # 터미널 IPC 클라이언트 함수
```

### Backend (Electron Main Process)

```
electron/
├── services/
│   └── pty.service.ts               # PTY 인스턴스 관리
├── ipc/
│   └── terminal.ipc.ts              # 터미널 IPC 핸들러
└── preload.ts                       # (수정) 터미널 채널 추가
```

---

## Component Details

### 1. TerminalView.tsx

**책임**: 터미널 모드의 최상위 컨테이너

```typescript
interface TerminalViewProps {
  initialCwd?: string;  // 초기 작업 디렉토리
}

// 상태 관리
interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string;
}

interface TerminalTab {
  id: string;
  name: string;
  panes: TerminalPane[];
  layout: PaneLayout;
}

interface TerminalPane {
  id: string;
  ptyId: string;       // Main Process의 PTY ID
  cwd: string;
}

type PaneLayout =
  | { type: 'single' }
  | { type: 'horizontal'; sizes: number[] }
  | { type: 'vertical'; sizes: number[] }
  | { type: 'grid'; sizes: number[][] };
```

**렌더링 구조**:
```tsx
<div className="flex flex-col h-full bg-[#050508]">
  <TerminalTabBar
    tabs={tabs}
    activeTabId={activeTabId}
    onTabSelect={handleTabSelect}
    onTabClose={handleTabClose}
    onTabAdd={handleTabAdd}
    onSplitRequest={handleSplit}
  />
  <div className="flex-1 overflow-hidden">
    <SplitContainer
      panes={activeTab.panes}
      layout={activeTab.layout}
      onPaneClose={handlePaneClose}
      onLayoutChange={handleLayoutChange}
    />
  </div>
</div>
```

### 2. TerminalTabBar.tsx

**책임**: 탭 네비게이션 및 Split 메뉴

```
┌─────────────────────────────────────────────────────────────────┐
│ [Tab 1 ✕] [Tab 2 ✕] [+]                           [Split ▼]    │
└─────────────────────────────────────────────────────────────────┘
```

**스타일링** (TaskFlow 테마):
```tsx
// 탭 바 컨테이너
className="flex items-center justify-between px-4 py-2
           bg-slate-900/50 border-b border-white/5"

// 활성 탭
className="px-4 py-2 text-sm font-medium text-cyan-400
           bg-cyan-500/10 border-b-2 border-cyan-400 rounded-t-lg"

// 비활성 탭
className="px-4 py-2 text-sm font-medium text-slate-400
           hover:text-white hover:bg-slate-800/50 rounded-t-lg"

// [+] 버튼
className="p-2 text-slate-400 hover:text-cyan-400
           hover:bg-slate-800/50 rounded-lg"

// Split 버튼
className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400
           hover:text-white hover:bg-slate-800/50 rounded-lg"
```

### 3. TerminalPane.tsx

**책임**: xterm.js 터미널 렌더링 및 PTY 연결

```typescript
interface TerminalPaneProps {
  ptyId: string;
  isActive: boolean;
  onFocus: () => void;
}
```

**xterm.js 설정**:
```typescript
const terminalOptions: ITerminalOptions = {
  theme: {
    background: '#050508',
    foreground: '#e2e8f0',      // slate-200
    cursor: '#06b6d4',          // cyan-500
    cursorAccent: '#050508',
    selectionBackground: 'rgba(6, 182, 212, 0.3)', // cyan-500/30
    black: '#1e293b',           // slate-800
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    blue: '#3b82f6',
    magenta: '#a855f7',
    cyan: '#06b6d4',
    white: '#f8fafc',
    brightBlack: '#475569',
    brightRed: '#f87171',
    brightGreen: '#4ade80',
    brightYellow: '#facc15',
    brightBlue: '#60a5fa',
    brightMagenta: '#c084fc',
    brightCyan: '#22d3ee',
    brightWhite: '#ffffff',
  },
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  fontSize: 13,
  lineHeight: 1.4,
  cursorBlink: true,
  cursorStyle: 'block',
  scrollback: 10000,
  allowProposedApi: true,
};
```

### 4. SplitContainer.tsx

**책임**: Pane 분할 레이아웃 관리

**분할 로직**:
```typescript
// 수평 분할 (Split Right)
function splitHorizontal(panes: Pane[], targetId: string): Pane[] {
  const index = panes.findIndex(p => p.id === targetId);
  const newPane = createPane();
  return [...panes.slice(0, index + 1), newPane, ...panes.slice(index + 1)];
}

// 레이아웃 렌더링
function renderLayout(layout: PaneLayout, panes: Pane[]) {
  switch (layout.type) {
    case 'single':
      return <TerminalPane {...panes[0]} />;
    case 'horizontal':
      return (
        <div className="flex h-full">
          {panes.map((pane, i) => (
            <Fragment key={pane.id}>
              <div style={{ width: `${layout.sizes[i]}%` }}>
                <TerminalPane {...pane} />
              </div>
              {i < panes.length - 1 && <ResizeHandle direction="horizontal" />}
            </Fragment>
          ))}
        </div>
      );
    // ... vertical, grid
  }
}
```

---

## IPC Communication Design

### Channel Definitions

```typescript
// electron/ipc/terminal.ipc.ts

// Invoke Channels (Renderer → Main)
type TerminalInvokeChannel =
  | 'terminal:create'      // PTY 생성
  | 'terminal:write'       // PTY 입력
  | 'terminal:resize'      // PTY 크기 조정
  | 'terminal:kill'        // PTY 종료
  | 'terminal:getCwd';     // 현재 작업 디렉토리 조회

// Receive Channels (Main → Renderer)
type TerminalReceiveChannel =
  | 'terminal:data'        // PTY 출력
  | 'terminal:exit';       // PTY 종료 이벤트
```

### IPC Handlers

```typescript
// terminal:create
interface CreatePtyRequest {
  cwd: string;
  cols: number;
  rows: number;
}
interface CreatePtyResponse {
  ptyId: string;
  pid: number;
}

// terminal:write
interface WritePtyRequest {
  ptyId: string;
  data: string;
}

// terminal:resize
interface ResizePtyRequest {
  ptyId: string;
  cols: number;
  rows: number;
}

// terminal:data (event)
interface PtyDataEvent {
  ptyId: string;
  data: string;
}

// terminal:exit (event)
interface PtyExitEvent {
  ptyId: string;
  exitCode: number;
}
```

---

## PTY Service Design

### pty.service.ts

```typescript
import * as pty from 'node-pty';

interface PtyInstance {
  id: string;
  process: pty.IPty;
  cwd: string;
}

class PtyService {
  private instances: Map<string, PtyInstance> = new Map();

  create(cwd: string, cols: number, rows: number): PtyInstance {
    const shell = process.env.SHELL || '/bin/zsh';
    const id = crypto.randomUUID();

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: process.env as Record<string, string>,
    });

    const instance: PtyInstance = { id, process: ptyProcess, cwd };
    this.instances.set(id, instance);

    return instance;
  }

  write(id: string, data: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.process.write(data);
    }
  }

  resize(id: string, cols: number, rows: number): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.process.resize(cols, rows);
    }
  }

  kill(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.process.kill();
      this.instances.delete(id);
    }
  }

  onData(id: string, callback: (data: string) => void): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.process.onData(callback);
    }
  }

  onExit(id: string, callback: (exitCode: number) => void): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.process.onExit(({ exitCode }) => callback(exitCode));
    }
  }

  killAll(): void {
    for (const [id] of this.instances) {
      this.kill(id);
    }
  }
}

export const ptyService = new PtyService();
```

---

## State Management

### useTerminal Hook

```typescript
interface UseTerminalReturn {
  tabs: TerminalTab[];
  activeTabId: string;
  createTab: () => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  splitPane: (tabId: string, direction: 'horizontal' | 'vertical') => void;
  closePane: (tabId: string, paneId: string) => void;
}

function useTerminal(initialCwd: string): UseTerminalReturn {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // 초기 탭 생성
  useEffect(() => {
    if (tabs.length === 0) {
      createTab();
    }
  }, []);

  const createTab = async () => {
    const pane = await createPane(initialCwd);
    const tab: TerminalTab = {
      id: crypto.randomUUID(),
      name: `Tab ${tabs.length + 1}`,
      panes: [pane],
      layout: { type: 'single' },
    };
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  // ... other methods
}
```

---

## Keyboard Shortcuts

| 단축키 | 동작 | 구현 위치 |
|--------|------|-----------|
| ⌘T | 새 탭 | TerminalView |
| ⌘W | 탭/Pane 닫기 | TerminalView |
| ⌘1-9 | 탭 전환 | TerminalView |
| ⌘D | Split Right | TerminalView |
| ⇧⌘D | Split Down | TerminalView |
| ⇧⌘↵ | Pane 최대화 | SplitContainer |
| ⌘K | 터미널 클리어 | TerminalPane |
| ⌘+/- | 폰트 크기 | TerminalPane |
| ⌘F | 검색 | TerminalPane |

---

## Error Handling

### PTY Creation Failure
```typescript
try {
  const pty = await createPty(cwd);
} catch (error) {
  // 에러 토스트 표시
  showToast({
    type: 'error',
    message: 'Failed to create terminal',
    description: error.message,
  });
  // 마지막 탭이면 Tasks 모드로 복귀
  if (tabs.length === 0) {
    onExitTerminalMode();
  }
}
```

### PTY Exit Handling
```typescript
// 비정상 종료 시 (exitCode !== 0)
if (exitCode !== 0) {
  // Pane에 종료 메시지 표시
  terminal.writeln(`\r\n[Process exited with code ${exitCode}]`);
  terminal.writeln('[Press any key to close]');
}

// 정상 종료 시 Pane 자동 닫기
if (exitCode === 0 && autoClose) {
  closePane(tabId, paneId);
}
```

---

## Security Considerations

1. **환경 변수**: 민감한 환경 변수 필터링 고려
2. **명령어 실행**: 사용자 입력 그대로 전달 (샌드박스 없음)
3. **파일 시스템 접근**: activeSource.path 기반으로 제한 가능 (선택적)

---

## Performance Optimizations

1. **xterm.js Addons**:
   - `WebLinksAddon`: URL 자동 감지 및 클릭
   - `FitAddon`: 컨테이너에 맞게 자동 리사이즈
   - `SearchAddon`: 효율적인 텍스트 검색

2. **Virtualized Scrolling**: xterm.js 내장 기능 활용

3. **Debounced Resize**: 리사이즈 이벤트 디바운싱 (100ms)

4. **Lazy Tab Loading**: 탭 전환 시에만 PTY 생성 (선택적)

---

## Testing Strategy

### Unit Tests
- useTerminal hook 로직
- 탭/Pane 관리 함수
- IPC 메시지 직렬화

### Integration Tests
- PTY 생성 및 입출력
- 탭 생성/삭제 플로우
- Split/Close 동작

### E2E Tests
- 모드 전환 플로우
- 실제 명령어 실행
- 키보드 단축키
