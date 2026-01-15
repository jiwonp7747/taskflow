# Terminal Issues Workflow Document

> Generated: 2026-01-15
> Status: Active Implementation
> Complexity: High (Multi-component, React lifecycle, Native module integration)

## Overview

TaskFlow Electron 앱의 통합 터미널 기능에서 발견된 4가지 이슈에 대한 구현 워크플로우 문서입니다.

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────────┐    ┌────────────────────────────────┐  │
│  │ isTerminalMode  │───▶│         TerminalView           │  │
│  │    (boolean)    │    │  ┌──────────────────────────┐  │  │
│  └─────────────────┘    │  │       TerminalTabBar     │  │  │
│                         │  └──────────────────────────┘  │  │
│                         │  ┌──────────────────────────┐  │  │
│                         │  │      TerminalPane[]      │  │  │
│                         │  │  ┌────────────────────┐  │  │  │
│                         │  │  │   xterm.js + PTY   │  │  │  │
│                         │  │  └────────────────────┘  │  │  │
│                         │  └──────────────────────────┘  │  │
│                         └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ IPC
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   pty.service.ts                     │    │
│  │  ┌─────────────────┐    ┌───────────────────────┐   │    │
│  │  │   node-pty      │    │   PTY Process Pool    │   │    │
│  │  │ (winpty/ConPTY) │    │   Map<id, ptyProcess> │   │    │
│  │  └─────────────────┘    └───────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Terminal mode toggle, session lifecycle |
| `src/components/terminal/TerminalView.tsx` | Tab/Pane management, layout state |
| `src/components/terminal/TerminalPane.tsx` | xterm.js instance, PTY connection |
| `src/components/terminal/TerminalTabBar.tsx` | Tab UI, split menu |
| `electron/services/pty.service.ts` | node-pty wrapper, process management |
| `src/lib/terminalIpc.ts` | IPC client functions |

---

## Issue #1: xterm.js Dimensions Error

### Symptom
콘솔에 `Cannot read properties of undefined (reading 'dimensions')` 에러가 지속적으로 발생

### Root Cause Analysis

```typescript
// TerminalPane.tsx:119-124
try {
  fitAddon.fit();  // ❌ 컨테이너가 DOM에 완전히 렌더링되기 전 호출
} catch (e) {
  console.warn('Initial fit failed:', e);
}
```

**문제점:**
1. `requestAnimationFrame`으로 컨테이너 크기 체크는 하지만, xterm.js 내부 `_core` 객체 초기화 타이밍과 불일치
2. `FitAddon.fit()`은 terminal이 DOM에 완전히 attach되고 내부 dimensions 계산이 완료된 후에만 안전하게 호출 가능

### Solution Strategy

**Phase 1: Terminal Ready 이벤트 활용**
```typescript
// xterm.js의 onRender 또는 첫 번째 렌더링 완료 후 fit 호출
terminal.onRender(() => {
  if (!fittedRef.current && fitAddon) {
    try {
      fitAddon.fit();
      fittedRef.current = true;
    } catch (e) {
      // 아직 준비 안됨, 다음 render에서 재시도
    }
  }
});
```

**Phase 2: ResizeObserver 기반 안전한 fit**
```typescript
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
      requestAnimationFrame(() => {
        if (terminalRef.current && fitAddonRef.current) {
          try {
            fitAddonRef.current.fit();
          } catch (e) {
            // silent ignore - terminal not ready
          }
        }
      });
    }
  }
});
```

### Implementation Steps

- [ ] **Step 1.1**: `TerminalPane.tsx`에 `fittedRef` 추가하여 첫 fit 완료 추적
- [ ] **Step 1.2**: `terminal.onRender()` 이벤트 핸들러에서 안전한 첫 fit 수행
- [ ] **Step 1.3**: `ResizeObserver` 도입하여 window resize 대신 container resize 감지
- [ ] **Step 1.4**: fit 실패 시 silent fail (에러 로그 제거)
- [ ] **Step 1.5**: 테스트 - 터미널 열기/닫기/분할 시 에러 없음 확인

### Risk Assessment
- **복잡도**: Medium
- **영향 범위**: TerminalPane.tsx only
- **회귀 위험**: Low (에러 핸들링 개선)

---

## Issue #2: Terminal Session Persistence

### Symptom
Panel 버튼 클릭 시 터미널 세션이 종료되고 다시 열면 새 세션 시작

### Root Cause Analysis

```typescript
// App.tsx:412-416
{isTerminalMode ? (
  <TerminalView
    initialCwd={activeSource?.path}
    onClose={() => setIsTerminalMode(false)}
  />
) : (
  // ... 다른 뷰
)}
```

**문제점:**
1. `isTerminalMode`가 `false`가 되면 `TerminalView` 컴포넌트가 unmount
2. Unmount 시 `TerminalPane`의 cleanup 함수가 실행되어 PTY 프로세스 종료
3. 다시 `true`가 되면 완전히 새로운 컴포넌트 인스턴스 생성

### Solution Strategy

**Option A: CSS visibility로 숨기기 (Recommended)**
```typescript
// TerminalView를 항상 렌더링하되 display로 숨김
<div style={{ display: isTerminalMode ? 'block' : 'none' }}>
  <TerminalView ... />
</div>
```

**Option B: 전역 터미널 상태 관리**
```typescript
// 터미널 상태를 App.tsx 레벨로 끌어올림
const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([]);
// TerminalView에 props로 전달
```

**Option C: Portal + 상태 분리**
```typescript
// React Portal로 DOM 위치와 React 트리 분리
// 터미널은 항상 body에 렌더링, 표시만 토글
```

### Recommended: Option A (Simplest)

```typescript
// App.tsx 수정
// 터미널 뷰 항상 마운트, visibility만 토글
{/* Terminal View - 항상 마운트, display로 제어 */}
<div
  style={{
    display: isTerminalMode ? 'block' : 'none',
    position: isTerminalMode ? 'relative' : 'absolute',
    visibility: isTerminalMode ? 'visible' : 'hidden',
    // 숨겨져 있을 때 상호작용 방지
    pointerEvents: isTerminalMode ? 'auto' : 'none',
  }}
>
  <TerminalView
    initialCwd={activeSource?.path}
    onClose={() => setIsTerminalMode(false)}
  />
</div>

{/* 다른 뷰들 - 터미널 모드가 아닐 때만 표시 */}
{!isTerminalMode && (
  <>
    {/* ViewToggle, FilterBar, TaskBoard/CalendarView */}
  </>
)}
```

### Implementation Steps

- [ ] **Step 2.1**: `App.tsx`에서 조건부 렌더링을 CSS display 제어로 변경
- [ ] **Step 2.2**: 숨겨진 상태에서 키보드 이벤트가 터미널로 가지 않도록 처리
- [ ] **Step 2.3**: 터미널 숨김 상태에서 PTY 데이터 수신은 계속되도록 확인
- [ ] **Step 2.4**: 메모리 누수 테스트 (장시간 숨김 후 다시 표시)
- [ ] **Step 2.5**: 테스트 - Panel 토글해도 세션 유지 확인

### Risk Assessment
- **복잡도**: Low
- **영향 범위**: App.tsx
- **회귀 위험**: Medium (숨겨진 터미널의 리소스 사용)

---

## Issue #3: First Split Closes Existing Session

### Symptom
첫 번째 split 생성 시 기존 터미널 세션이 닫히고, 두 번째 이후 split은 정상 작동

### Root Cause Analysis

```typescript
// TerminalView.tsx:93-117 handleSplitRequest
const handleSplitRequest = useCallback((direction: 'horizontal' | 'vertical') => {
  const activeTab = tabs.find(t => t.id === activeTabId);
  if (!activeTab || activeTab.panes.length >= 4) return;

  const cwd = initialCwd || '~';
  const newPane = createPane(cwd);

  setTabs((prev) => prev.map((tab) => {
    if (tab.id !== activeTabId) return tab;

    const newPanes = [...tab.panes, newPane];  // 기존 panes + 새 pane
    const sizes = newPanes.map(() => 100 / newPanes.length);

    return {
      ...tab,
      panes: newPanes,
      layout: {
        type: direction,  // ❌ layout.type이 'single' → 'horizontal'로 변경
        sizes,
      },
    };
  }));

  setActivePaneId(newPane.id);
}, [tabs, activeTabId, initialCwd, createPane]);
```

**추정 원인:**
1. layout type 변경 시 (`single` → `horizontal/vertical`) React가 기존 pane을 새로운 위치에 재렌더링
2. `key={pane.id}`가 동일해도 부모 컨테이너 구조가 변경되어 unmount/remount 발생 가능
3. `renderPanes()` 함수 내 조건부 렌더링 구조가 문제:

```typescript
// TerminalView.tsx:183-238
const renderPanes = () => {
  if (layout.type === 'single' || panes.length === 1) {
    // 구조 A: 단일 TerminalPane 직접 반환
    return <TerminalPane key={pane.id} ... />;
  }

  // 구조 B: div > div[] > TerminalPane
  return (
    <div className="flex ...">
      {panes.map((pane, index) => (
        <div key={pane.id} ...>
          <TerminalPane ... />
        </div>
      ))}
    </div>
  );
};
```

**핵심 문제:**
- `single` → `split` 전환 시 `TerminalPane`의 부모 구조가 완전히 바뀜
- React는 이를 새로운 컴포넌트로 인식하여 기존 인스턴스를 unmount

### Solution Strategy

**일관된 렌더링 구조 사용:**
```typescript
const renderPanes = () => {
  if (!activeTab) return null;

  const { panes, layout } = activeTab;
  const isHorizontal = layout.type === 'horizontal';
  const sizes = layout.type === 'single'
    ? [100]
    : ('sizes' in layout ? layout.sizes : panes.map(() => 100 / panes.length));

  // 항상 동일한 구조 사용 (single일 때도 wrapper div 포함)
  return (
    <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full`}>
      {panes.map((pane, index) => (
        <div
          key={pane.id}
          className="relative"
          style={{
            [isHorizontal ? 'width' : 'height']: `${sizes[index]}%`,
            flex: layout.type === 'single' ? '1' : 'none',
          }}
        >
          <TerminalPane
            paneId={pane.id}
            cwd={pane.cwd}
            isActive={pane.id === activePaneId}
            onPtyCreated={(ptyId) => handlePtyCreated(pane.id, ptyId)}
            onPtyExited={(exitCode) => handlePtyExited(pane.id, exitCode)}
            onFocus={() => handlePaneFocus(pane.id)}
          />
          {/* Resize handle */}
          {index < panes.length - 1 && (
            <div className="..." />
          )}
        </div>
      ))}
    </div>
  );
};
```

### Implementation Steps

- [ ] **Step 3.1**: `renderPanes()` 함수를 단일 구조로 리팩토링
- [ ] **Step 3.2**: layout type에 관계없이 동일한 wrapper 구조 유지
- [ ] **Step 3.3**: flex 속성으로 single/split 레이아웃 구분
- [ ] **Step 3.4**: 테스트 - 첫 split 시 기존 세션 유지 확인
- [ ] **Step 3.5**: 테스트 - 연속 split 시 모든 세션 유지 확인

### Risk Assessment
- **복잡도**: Medium
- **영향 범위**: TerminalView.tsx의 renderPanes 함수
- **회귀 위험**: Medium (레이아웃 변경으로 인한 스타일 문제 가능)

---

## Issue #4: Split Pane Resize/Fit

### Symptom
Split 시 터미널 내용이 새 pane 크기에 맞게 조정되지 않고, 기존 크기로 유지되어 새 pane에 가려짐

### Root Cause Analysis

```typescript
// TerminalPane.tsx:192-227 리사이즈 처리
useEffect(() => {
  const handleResize = () => {
    if (!fitAddonRef.current || !terminalRef.current || !containerRef.current) return;

    try {
      if (containerRef.current.offsetWidth > 0 && containerRef.current.offsetHeight > 0) {
        fitAddonRef.current.fit();
        if (ptyIdRef.current) {
          const { cols, rows } = terminalRef.current;
          resizePty(ptyIdRef.current, cols, rows);
        }
      }
    } catch (e) {
      console.warn('Terminal resize failed:', e);
    }
  };

  // ❌ window resize만 감지, container 크기 변화는 감지 안 함
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

**문제점:**
1. `window.resize` 이벤트만 감지 - split으로 인한 container 크기 변화는 감지 못함
2. Parent의 layout 변경 (sizes 배열 수정) 시 child인 TerminalPane에 알림 없음
3. `FitAddon.fit()`이 호출되지 않아 xterm.js가 새 크기로 재계산하지 않음

### Solution Strategy

**Phase 1: ResizeObserver 사용**
```typescript
useEffect(() => {
  if (!containerRef.current) return;

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        // Debounce fit call
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = setTimeout(() => {
          if (fitAddonRef.current && terminalRef.current) {
            try {
              fitAddonRef.current.fit();
              if (ptyIdRef.current) {
                const { cols, rows } = terminalRef.current;
                resizePty(ptyIdRef.current, cols, rows);
              }
            } catch (e) {
              // ignore
            }
          }
        }, 50);
      }
    }
  });

  resizeObserver.observe(containerRef.current);

  return () => {
    resizeObserver.disconnect();
    clearTimeout(resizeTimeoutRef.current);
  };
}, []);
```

**Phase 2: Parent에서 resize 트리거**
```typescript
// TerminalView.tsx - split 후 기존 pane들에 resize 알림
interface TerminalPaneProps {
  // ... 기존 props
  triggerResize?: number;  // 변경될 때마다 resize 트리거
}

// handleSplitRequest에서
setResizeTrigger(prev => prev + 1);  // 모든 pane에 resize 신호 전달
```

### Implementation Steps

- [ ] **Step 4.1**: `TerminalPane.tsx`에 `ResizeObserver` 추가
- [ ] **Step 4.2**: window resize 이벤트 리스너 제거 (ResizeObserver가 대체)
- [ ] **Step 4.3**: resize 시 debounce 적용 (50-100ms)
- [ ] **Step 4.4**: resize 후 PTY에 새 cols/rows 전달
- [ ] **Step 4.5**: 테스트 - split 시 모든 pane이 올바른 크기로 표시 확인
- [ ] **Step 4.6**: 테스트 - resize handle 드래그 시 터미널 크기 조정 확인

### Risk Assessment
- **복잡도**: Medium
- **영향 범위**: TerminalPane.tsx
- **회귀 위험**: Low (ResizeObserver는 더 정확한 크기 감지)

---

## Implementation Order & Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                   Implementation Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Issue #1 ──────────┐                                      │
│   (dimensions)       │                                      │
│                      ▼                                      │
│                 Issue #4 ◀─────── Issue #3                  │
│                (resize)          (split structure)          │
│                      │                                      │
│                      ▼                                      │
│                 Issue #2                                    │
│              (persistence)                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Order

1. **Issue #4 (Resize)** - ResizeObserver 추가는 다른 이슈의 기반
2. **Issue #1 (Dimensions)** - #4와 함께 수정하면 효율적
3. **Issue #3 (Split Structure)** - 렌더링 구조 변경, resize 로직 필요
4. **Issue #2 (Persistence)** - 독립적, 마지막에 구현 가능

### Estimated Complexity

| Issue | Complexity | Files Changed | Estimated Effort |
|-------|------------|---------------|------------------|
| #1 | Medium | 1 | 2-3 hours |
| #2 | Low | 1 | 1-2 hours |
| #3 | Medium | 1 | 2-3 hours |
| #4 | Medium | 1 | 2-3 hours |
| **Total** | | | **7-11 hours** |

---

## Testing Checklist

### Issue #1 Tests
- [ ] 터미널 처음 열 때 dimensions 에러 없음
- [ ] 탭 전환 시 에러 없음
- [ ] split 생성/제거 시 에러 없음

### Issue #2 Tests
- [ ] Panel 버튼 토글 시 세션 유지
- [ ] 숨김 상태에서 백그라운드 명령 실행 후 다시 열었을 때 출력 표시
- [ ] 장시간 숨김 후에도 정상 작동

### Issue #3 Tests
- [ ] 첫 번째 split 시 기존 세션 유지
- [ ] 4개 pane까지 split 시 모든 세션 유지
- [ ] pane 닫기 시 다른 pane 영향 없음

### Issue #4 Tests
- [ ] split 시 모든 pane이 올바른 크기로 표시
- [ ] 창 크기 조절 시 모든 pane 자동 조정
- [ ] resize handle 드래그 시 실시간 크기 조정

---

## Rollback Plan

각 이슈별 변경사항은 독립적으로 revert 가능하도록 커밋 분리:

```bash
git revert <issue-1-commit>  # dimensions fix만 롤백
git revert <issue-2-commit>  # persistence만 롤백
git revert <issue-3-commit>  # split structure만 롤백
git revert <issue-4-commit>  # resize만 롤백
```

---

## References

- [xterm.js FitAddon Documentation](https://github.com/xtermjs/xterm.js/tree/master/addons/xterm-addon-fit)
- [ResizeObserver API](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [React key 속성과 리렌더링](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [node-pty resize handling](https://github.com/microsoft/node-pty#resize)
