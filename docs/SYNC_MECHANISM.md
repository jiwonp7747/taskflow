# TaskFlow 동기화 메커니즘

TaskFlow는 두 가지 독립적인 동기화 메커니즘을 사용합니다.

## 개요

| 구분 | 파일 동기화 (UI 업데이트) | AI Agent 폴링 |
|------|--------------------------|---------------|
| 목적 | 파일 변경 시 UI 실시간 반영 | TODO/NEED_FIX 태스크 자동 실행 |
| 방식 | chokidar + SSE | setInterval 폴링 |
| 로그 프리픽스 | `[FileWatcher]` | `[AI Worker]` |
| 설정 | 없음 (고정) | `.taskflow.config.json` |

---

## 1. 파일 동기화 (File Sync)

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           파일 시스템                                    │
│                    (tasks/*.md 파일들)                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ OS 이벤트 + 폴링 (awaitWriteFinish)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    chokidar (파일 감시자)                                │
│                    lib/fileWatcher.ts                                   │
│         - add (생성), change (수정), unlink (삭제) 감지                  │
│         - awaitWriteFinish: 50ms 폴링으로 쓰기 완료 확인                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ FileWatchEvent 브로드캐스트
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SSE Endpoint                                         │
│                    app/api/watch/route.ts                               │
│                    - Server-Sent Events 스트림                          │
│                    - 30초 heartbeat                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SSE (text/event-stream)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    useFileWatcher Hook                                  │
│                    hooks/useFileWatcher.ts                              │
│                    - EventSource로 SSE 연결                             │
│                    - 자동 재연결 (exponential backoff)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ onFileChange callback
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    page.tsx                                             │
│                    - fetchTasks() 호출하여 전체 태스크 리로드            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 관련 파일

| 파일 | 역할 |
|------|------|
| `lib/fileWatcher.ts` | chokidar 기반 파일 감시 서비스 (Singleton) |
| `app/api/watch/route.ts` | SSE 엔드포인트 |
| `hooks/useFileWatcher.ts` | 프론트엔드 SSE 연결 훅 |

### chokidar 설정

```typescript
chokidar.watch(path.join(directory, '*.md'), {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,  // 파일 크기가 100ms 동안 변하지 않으면 완료
    pollInterval: 50,         // 50ms 간격으로 파일 크기 확인
  },
});
```

### 이벤트 타입

```typescript
interface FileWatchEvent {
  type: 'add' | 'change' | 'unlink';
  taskId: string;    // 파일명에서 추출
  path: string;      // 전체 파일 경로
  timestamp: number;
}
```

### 로그 출력

**Backend (`lib/fileWatcher.ts`):**
```
[FileWatcher] Started watching: C:\path\to\tasks
[FileWatcher] File event: change - task-001
[FileWatcher] Error: ...
```

**Frontend (`hooks/useFileWatcher.ts`):**
```
[FileWatcher] SSE connected
[FileWatcher] SSE event received: { type: 'change', taskId: 'task-001' }
[FileWatcher] SSE heartbeat
[FileWatcher] SSE disconnected, reconnecting... (attempt 1)
[FileWatcher] SSE error: ...
```

---

## 2. AI Agent 폴링

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI Worker                                            │
│                    lib/aiWorker.ts                                      │
│                                                                         │
│    ┌─────────────────────────────────────────────────────────────┐     │
│    │              setInterval(pollForTasks, 30000)               │     │
│    │                                                             │     │
│    │  1. findEligibleTasks()                                     │     │
│    │     - assignee === 'ai-agent'                               │     │
│    │     - status === 'TODO' || status === 'NEED_FIX'            │     │
│    │                                                             │     │
│    │  2. addToQueue(task)                                        │     │
│    │                                                             │     │
│    │  3. processQueue()                                          │     │
│    │     - executeClaudeCode()                                   │     │
│    │     - 완료 시 IN_REVIEW로 상태 변경                          │     │
│    │     - 실패 시 NEED_FIX로 상태 변경                           │     │
│    └─────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket 브로드캐스트
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SSE Endpoint                                         │
│                    app/api/ai/stream/route.ts                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    useAIWorker Hook                                     │
│                    hooks/useAIWorker.ts                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 설정 (`.taskflow.config.json`)

```json
{
  "aiWorker": {
    "enabled": true,
    "autoStart": false,
    "pollingInterval": 30000,  // 30초
    "maxConcurrent": 1,
    "timeout": 600000          // 10분
  }
}
```

### 로그 출력

```
[AI Worker] Finding eligible tasks...
[AI Worker] All tasks: [{ id: 'task-001', status: 'TODO', assignee: 'ai-agent' }, ...]
[AI Worker] Eligible tasks: [{ id: 'task-001', title: '...' }]
[AI Worker] Executing task: { id: 'task-001', title: '...', status: 'TODO' }
Error polling for tasks: ...
```

---

## 3. 두 시스템의 관계

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         독립적 동작                                      │
│                                                                         │
│   ┌─────────────────────┐         ┌─────────────────────┐              │
│   │   파일 동기화        │         │   AI Agent 폴링     │              │
│   │   (FileWatcher)     │         │   (AI Worker)       │              │
│   │                     │         │                     │              │
│   │   목적: UI 업데이트  │         │   목적: 태스크 실행  │              │
│   │   트리거: 파일 변경  │         │   트리거: 30초 주기  │              │
│   └─────────────────────┘         └─────────────────────┘              │
│              │                               │                          │
│              │                               │                          │
│              ▼                               ▼                          │
│   ┌─────────────────────────────────────────────────────────────┐      │
│   │                      파일 시스템                             │      │
│   │                   (tasks/*.md)                              │      │
│   └─────────────────────────────────────────────────────────────┘      │
│                                                                         │
│   AI Worker가 태스크 상태 변경 → FileWatcher가 감지 → UI 자동 업데이트   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 상호작용 시나리오

1. **AI Worker가 태스크 실행 완료**
   - `updateTask()` 호출 → `.md` 파일 수정
   - chokidar가 파일 변경 감지
   - SSE로 프론트엔드에 전달
   - UI 자동 업데이트

2. **사용자가 태스크 생성**
   - `createTask()` 호출 → `.md` 파일 생성
   - chokidar가 파일 생성 감지
   - SSE로 프론트엔드에 전달
   - UI 자동 업데이트
   - AI Worker 다음 폴링 시 새 태스크 발견

---

## 4. 디버깅

### 로그 확인 방법

**브라우저 개발자 도구 (Console):**
```
[FileWatcher] SSE connected
[FileWatcher] SSE event received: { type: 'change', taskId: 'task-001' }
```

**서버 터미널:**
```
[FileWatcher] Started watching: C:\path\to\tasks
[AI Worker] Finding eligible tasks...
[AI Worker] Eligible tasks: []
```

### 연결 상태 확인

- UI 헤더의 "Live Sync" 표시
  - 초록색 점: SSE 연결됨
  - 빨간색 점: SSE 연결 끊김

### 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| UI가 자동 업데이트 안됨 | SSE 연결 끊김 | Reconnect 버튼 클릭 |
| AI Worker가 태스크 실행 안함 | Worker 중지됨 | AI Status Bar에서 Start 클릭 |
| 파일 변경이 감지 안됨 | chokidar 미시작 | 페이지 새로고침 |
