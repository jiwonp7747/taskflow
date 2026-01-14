# Terminal Feature - Implementation Tasks

## Overview

**Feature Name**: Integrated Terminal
**Version**: 1.0
**Created**: 2026-01-15
**Total Phases**: 4

---

## Phase 1: Mode Switching & Basic UI

### Task 1.1: Add Terminal Mode State to App
**Priority**: P0 - Critical
**Requirements**: US-1 (AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5)
**Estimated Complexity**: Low

**Implementation Steps**:
1. App.tsx에 `isTerminalMode` 상태 추가
2. 터미널 모드일 때 ViewToggle, FilterBar, TaskBoard/CalendarView 조건부 렌더링
3. 터미널 모드일 때 TerminalView 렌더링

**Files to Modify**:
- `src/App.tsx`

**Code Changes**:
```typescript
// App.tsx
const [isTerminalMode, setIsTerminalMode] = useState(false);

// 조건부 렌더링
{!isTerminalMode ? (
  <>
    {/* 기존 ViewToggle, FilterBar, TaskBoard/CalendarView */}
  </>
) : (
  <TerminalView initialCwd={activeSource?.path} />
)}
```

---

### Task 1.2: Add Terminal/Panel Toggle Button to Header
**Priority**: P0 - Critical
**Requirements**: US-1 (AC-1.1, AC-1.3)
**Estimated Complexity**: Low

**Implementation Steps**:
1. 헤더의 "New Task" 버튼 왼쪽에 Terminal/Panel 토글 버튼 추가
2. isTerminalMode 상태에 따라 버튼 텍스트 전환
3. 버튼 클릭 시 setIsTerminalMode 토글

**Files to Modify**:
- `src/App.tsx`

**Code Changes**:
```tsx
{/* Terminal/Panel 토글 버튼 - New Task 버튼 왼쪽 */}
<button
  onClick={() => setIsTerminalMode(!isTerminalMode)}
  className="flex items-center gap-2 px-4 py-2.5 text-slate-300 hover:text-white
             bg-slate-800/50 hover:bg-slate-800 border border-white/5
             rounded-lg transition-all"
>
  <svg className="w-4 h-4" /* terminal icon */ />
  <span>{isTerminalMode ? 'Panel' : 'Terminal'}</span>
</button>
```

---

### Task 1.3: Create TerminalView Component Shell
**Priority**: P0 - Critical
**Requirements**: US-1 (AC-1.2)
**Estimated Complexity**: Medium

**Implementation Steps**:
1. `src/components/terminal/` 디렉토리 생성
2. TerminalView.tsx 기본 구조 생성
3. TerminalTabBar.tsx placeholder 생성
4. index.ts export 파일 생성

**Files to Create**:
- `src/components/terminal/index.ts`
- `src/components/terminal/types.ts`
- `src/components/terminal/TerminalView.tsx`
- `src/components/terminal/TerminalTabBar.tsx`

**Code Template** (TerminalView.tsx):
```tsx
interface TerminalViewProps {
  initialCwd?: string;
}

export function TerminalView({ initialCwd }: TerminalViewProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-[#050508] rounded-xl
                    border border-white/5 overflow-hidden">
      <TerminalTabBar
        tabs={[]}
        activeTabId=""
        onTabSelect={() => {}}
        onTabClose={() => {}}
        onTabAdd={() => {}}
        onSplitRequest={() => {}}
      />
      <div className="flex-1 flex items-center justify-center text-slate-500">
        Terminal content will appear here
      </div>
    </div>
  );
}
```

---

### Task 1.4: Create TerminalTabBar Component
**Priority**: P1 - High
**Requirements**: US-2 (AC-2.2, AC-2.3, AC-2.4)
**Estimated Complexity**: Medium

**Implementation Steps**:
1. 탭 목록 렌더링 UI
2. [+] 새 탭 버튼
3. 각 탭의 [✕] 닫기 버튼
4. [Split ▼] 드롭다운 버튼 (placeholder)
5. TaskFlow 테마 스타일링

**Files to Modify**:
- `src/components/terminal/TerminalTabBar.tsx`

**Design Specs**:
```css
/* 탭 바 컨테이너 */
bg-slate-900/50 border-b border-white/5

/* 활성 탭 */
text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400

/* 비활성 탭 */
text-slate-400 hover:text-white hover:bg-slate-800/50
```

---

## Phase 2: PTY Integration

### Task 2.1: Install node-pty and Dependencies
**Priority**: P0 - Critical
**Requirements**: FR-3.1
**Estimated Complexity**: Medium

**Implementation Steps**:
1. node-pty 설치 (`npm install node-pty`)
2. xterm 및 addons 설치
3. electron-rebuild 설정 확인
4. 빌드 테스트

**Commands**:
```bash
npm install node-pty
npm install xterm xterm-addon-fit xterm-addon-web-links
npm run rebuild  # electron-rebuild
```

**Files to Modify**:
- `package.json`

---

### Task 2.2: Create PTY Service
**Priority**: P0 - Critical
**Requirements**: FR-3.1, FR-3.2, FR-3.3
**Estimated Complexity**: Medium

**Implementation Steps**:
1. `electron/services/pty.service.ts` 생성
2. PtyService 클래스 구현
3. create, write, resize, kill 메서드
4. 이벤트 핸들러 (onData, onExit)

**Files to Create**:
- `electron/services/pty.service.ts`

**Key Implementation**:
```typescript
import * as pty from 'node-pty';

class PtyService {
  private instances: Map<string, pty.IPty> = new Map();

  create(cwd: string, cols: number, rows: number) { /* ... */ }
  write(id: string, data: string) { /* ... */ }
  resize(id: string, cols: number, rows: number) { /* ... */ }
  kill(id: string) { /* ... */ }
  killAll() { /* ... */ }
}

export const ptyService = new PtyService();
```

---

### Task 2.3: Create Terminal IPC Handlers
**Priority**: P0 - Critical
**Requirements**: FR-3.1
**Estimated Complexity**: Medium

**Implementation Steps**:
1. `electron/ipc/terminal.ipc.ts` 생성
2. IPC 핸들러 등록 (create, write, resize, kill)
3. PTY 이벤트를 Renderer로 전달 (data, exit)
4. `electron/ipc/index.ts`에 등록
5. `electron/preload.ts`에 채널 추가

**Files to Create/Modify**:
- `electron/ipc/terminal.ipc.ts` (create)
- `electron/ipc/index.ts` (modify)
- `electron/preload.ts` (modify)
- `src/types/electron.d.ts` (modify)

**IPC Channels**:
```typescript
// Invoke
'terminal:create'
'terminal:write'
'terminal:resize'
'terminal:kill'

// Receive
'terminal:data'
'terminal:exit'
```

---

### Task 2.4: Create Terminal IPC Client Functions
**Priority**: P0 - Critical
**Requirements**: FR-3.1
**Estimated Complexity**: Low

**Implementation Steps**:
1. `src/lib/terminalIpc.ts` 생성
2. createPty, writePty, resizePty, killPty 함수
3. onPtyData, onPtyExit 이벤트 리스너 함수

**Files to Create**:
- `src/lib/terminalIpc.ts`

---

### Task 2.5: Create TerminalPane Component with xterm.js
**Priority**: P0 - Critical
**Requirements**: US-3 (AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-3.6)
**Estimated Complexity**: High

**Implementation Steps**:
1. `src/components/terminal/TerminalPane.tsx` 생성
2. xterm.js Terminal 인스턴스 생성
3. FitAddon 연동 (자동 리사이즈)
4. PTY 연결 (IPC를 통한 stdin/stdout)
5. TaskFlow 테마 적용

**Files to Create**:
- `src/components/terminal/TerminalPane.tsx`

**Key Implementation**:
```typescript
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

function TerminalPane({ ptyId, isActive, onFocus }: TerminalPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    const terminal = new Terminal({ /* TaskFlow theme */ });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current!);
    fitAddon.fit();

    // PTY 연결
    terminal.onData(data => writePty(ptyId, data));
    onPtyData(ptyId, data => terminal.write(data));

    return () => terminal.dispose();
  }, [ptyId]);

  return <div ref={terminalRef} className="h-full" />;
}
```

---

### Task 2.6: Integrate Terminal Components
**Priority**: P0 - Critical
**Requirements**: US-2 (AC-2.1), US-3
**Estimated Complexity**: Medium

**Implementation Steps**:
1. useTerminal 훅 생성 (탭/Pane 상태 관리)
2. TerminalView에서 useTerminal 사용
3. 첫 진입 시 자동으로 Tab 1 생성
4. 탭 추가/삭제 로직 연결

**Files to Create/Modify**:
- `src/hooks/useTerminal.ts` (create)
- `src/components/terminal/TerminalView.tsx` (modify)

---

## Phase 3: Tab System

### Task 3.1: Implement Tab Management Logic
**Priority**: P1 - High
**Requirements**: US-2 (AC-2.2, AC-2.3, AC-2.4, AC-2.5)
**Estimated Complexity**: Medium

**Implementation Steps**:
1. useTerminal 훅에 탭 관리 함수 구현
2. createTab: 새 탭 + PTY 생성
3. closeTab: 탭 닫기 + PTY 종료
4. selectTab: 활성 탭 전환
5. 마지막 탭 닫을 때 콜백

**Files to Modify**:
- `src/hooks/useTerminal.ts`

---

### Task 3.2: Implement Tab Keyboard Shortcuts
**Priority**: P1 - High
**Requirements**: US-2 (AC-2.6, AC-2.7)
**Estimated Complexity**: Medium

**Implementation Steps**:
1. TerminalView에 키보드 이벤트 핸들러 추가
2. ⌘T: 새 탭
3. ⌘W: 탭/Pane 닫기
4. ⌘1-9: 탭 전환

**Files to Modify**:
- `src/components/terminal/TerminalView.tsx`

**Code Template**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === 't') {
      e.preventDefault();
      createTab();
    }
    if (e.metaKey && e.key === 'w') {
      e.preventDefault();
      closeCurrentPane();
    }
    if (e.metaKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      selectTab(parseInt(e.key) - 1);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [createTab, closeCurrentPane, selectTab]);
```

---

### Task 3.3: Handle PTY Exit Events
**Priority**: P1 - High
**Requirements**: FR-3.3
**Estimated Complexity**: Low

**Implementation Steps**:
1. PTY exit 이벤트 수신 처리
2. 종료 메시지 표시 옵션
3. 자동 Pane 닫기 옵션

**Files to Modify**:
- `src/components/terminal/TerminalPane.tsx`
- `src/hooks/useTerminal.ts`

---

## Phase 4: Split Pane

### Task 4.1: Create SplitContainer Component
**Priority**: P2 - Medium
**Requirements**: US-4 (AC-4.1, AC-4.2, AC-4.3)
**Estimated Complexity**: High

**Implementation Steps**:
1. `src/components/terminal/SplitContainer.tsx` 생성
2. 레이아웃 타입별 렌더링 (single, horizontal, vertical)
3. 리사이즈 핸들 구현
4. Pane 배열 관리

**Files to Create**:
- `src/components/terminal/SplitContainer.tsx`
- `src/components/terminal/ResizeHandle.tsx`

**Layout Types**:
```typescript
type PaneLayout =
  | { type: 'single' }
  | { type: 'horizontal'; sizes: number[] }
  | { type: 'vertical'; sizes: number[] };
```

---

### Task 4.2: Create Split Context Menu
**Priority**: P2 - Medium
**Requirements**: US-4 (AC-4.1, AC-4.2, AC-4.3)
**Estimated Complexity**: Medium

**Implementation Steps**:
1. `src/components/terminal/SplitContextMenu.tsx` 생성
2. 드롭다운 메뉴 UI
3. Split right, left, down, up 옵션
4. Close pane, Maximize pane 옵션

**Files to Create**:
- `src/components/terminal/SplitContextMenu.tsx`

**Menu Items**:
```
Split pane right      ⌘D
Split pane left
Split pane down       ⇧⌘D
Split pane up
─────────────────────
Maximize pane         ⇧⌘↵
Close pane            ⌘W
```

---

### Task 4.3: Implement Split Logic in useTerminal
**Priority**: P2 - Medium
**Requirements**: US-4 (AC-4.2, AC-4.3)
**Estimated Complexity**: Medium

**Implementation Steps**:
1. splitPane 함수 구현 (방향 파라미터)
2. 새 Pane에 대한 PTY 생성
3. 레이아웃 업데이트 로직
4. 최대 4개 Pane 제한

**Files to Modify**:
- `src/hooks/useTerminal.ts`

---

### Task 4.4: Implement Resize Handle Functionality
**Priority**: P2 - Medium
**Requirements**: US-4 (AC-4.4)
**Estimated Complexity**: Medium

**Implementation Steps**:
1. 드래그 앤 드롭으로 크기 조절
2. 최소 크기 제한 (100px)
3. PTY resize 이벤트 발생

**Files to Modify**:
- `src/components/terminal/ResizeHandle.tsx`
- `src/components/terminal/SplitContainer.tsx`

---

### Task 4.5: Implement Split Keyboard Shortcuts
**Priority**: P2 - Medium
**Requirements**: US-4 (AC-4.5, AC-4.6)
**Estimated Complexity**: Low

**Implementation Steps**:
1. ⌘D: Split right
2. ⇧⌘D: Split down
3. ⇧⌘↵: Maximize/restore pane
4. Pane 간 포커스 이동 (⌥⌘←/→/↑/↓)

**Files to Modify**:
- `src/components/terminal/TerminalView.tsx`

---

## Phase 5: Advanced Features (Optional)

### Task 5.1: Terminal Settings (Font Size)
**Priority**: P3 - Low
**Requirements**: US-5 (AC-5.1)
**Estimated Complexity**: Low

**Implementation Steps**:
1. ⌘+/⌘- 로 폰트 크기 조절
2. 상태 저장 (localStorage)

---

### Task 5.2: Terminal Clear (⌘K)
**Priority**: P3 - Low
**Requirements**: US-5 (AC-5.2)
**Estimated Complexity**: Low

**Implementation Steps**:
1. ⌘K로 터미널 클리어
2. xterm.clear() 호출

---

### Task 5.3: Terminal Search (⌘F)
**Priority**: P3 - Low
**Requirements**: US-5 (AC-5.3)
**Estimated Complexity**: Medium

**Implementation Steps**:
1. SearchAddon 연동
2. 검색 UI 구현
3. 검색 결과 하이라이트

---

## Summary

| Phase | Tasks | Priority | Status |
|-------|-------|----------|--------|
| Phase 1 | 1.1 - 1.4 | P0-P1 | Pending |
| Phase 2 | 2.1 - 2.6 | P0 | Pending |
| Phase 3 | 3.1 - 3.3 | P1 | Pending |
| Phase 4 | 4.1 - 4.5 | P2 | Pending |
| Phase 5 | 5.1 - 5.3 | P3 | Pending |

---

## Dependencies Graph

```
Phase 1 (UI)
    │
    ├─► Task 1.1 (Mode State)
    │       │
    │       ├─► Task 1.2 (Toggle Button)
    │       │
    │       └─► Task 1.3 (TerminalView Shell)
    │               │
    │               └─► Task 1.4 (TabBar)
    │
Phase 2 (PTY)
    │
    ├─► Task 2.1 (Dependencies)
    │       │
    │       └─► Task 2.2 (PTY Service)
    │               │
    │               └─► Task 2.3 (IPC Handlers)
    │                       │
    │                       └─► Task 2.4 (IPC Client)
    │                               │
    │                               └─► Task 2.5 (TerminalPane)
    │                                       │
    │                                       └─► Task 2.6 (Integration)
    │
Phase 3 (Tabs)
    │
    ├─► Task 3.1 (Tab Logic)
    │       │
    │       ├─► Task 3.2 (Shortcuts)
    │       │
    │       └─► Task 3.3 (Exit Events)
    │
Phase 4 (Split)
    │
    ├─► Task 4.1 (SplitContainer)
    │       │
    │       └─► Task 4.2 (Context Menu)
    │               │
    │               ├─► Task 4.3 (Split Logic)
    │               │
    │               ├─► Task 4.4 (Resize Handle)
    │               │
    │               └─► Task 4.5 (Shortcuts)
```
