# TaskFlow 채팅 세션 기능 구현 문서

> 작성일: 2026-01-12
> 버전: 1.0

---

## 목차

1. [개요](#1-개요)
2. [작업 내용](#2-작업-내용)
3. [트러블슈팅](#3-트러블슈팅)
4. [핵심 구현 내용](#4-핵심-구현-내용)
5. [아키텍처 플로우](#5-아키텍처-플로우)
6. [참고 자료](#6-참고-자료)
7. [향후 개선 사항](#7-향후-개선-사항)

---

## 1. 개요

### 1.1 프로젝트 배경

TaskFlow는 로컬 마크다운 파일 기반의 태스크 관리 시스템으로, Kanban UI를 통해 태스크를 관리하고 Claude AI와 대화형으로 태스크를 수행할 수 있는 기능을 제공합니다.

### 1.2 해결해야 할 문제

| 버그 ID | 설명 | 심각도 |
|---------|------|--------|
| BUG-001 | 세션 종료 버튼이 작동하지 않음 (Windows) | Medium |
| BUG-002 | 다른 세션이 열린 상태에서 새 세션 시작 시 오류 발생 | Medium |
| BUG-003 | Claude 응답이 표시되지 않고 "Claude가 응답 중..."만 표시됨 | **Critical** |

---

## 2. 작업 내용

### 2.1 세션 종료 기능 수정 (Windows 호환성)

**문제**: Unix 시스템의 `SIGTERM` 시그널이 Windows에서 작동하지 않음

**해결**: Windows용 `taskkill` 명령어 사용

```typescript
// Before (Unix only)
process.kill(pid, 'SIGTERM');

// After (Cross-platform)
if (process.platform === 'win32') {
  execSync(`taskkill /pid ${pid} /T /F`);
} else {
  process.kill(pid, 'SIGTERM');
}
```

### 2.2 다중 세션 지원

**문제**: 단일 `activeProcess` 변수로 인해 동시에 하나의 세션만 관리 가능

**해결**: `Map` 자료구조를 사용하여 태스크별 독립 세션 관리

```typescript
// Before
private activeProcess: ChildProcess | null = null;

// After
private sessions: Map<string, TaskSession> = new Map();
private runningTasks: Set<string> = new Set();
```

### 2.3 Claude CLI 응답 표시 문제 해결

**문제**: 비동기 `spawn`으로 Claude CLI 실행 시 응답이 오지 않고 무한 대기

**해결**: `execSync`로 동기 실행 방식으로 전환

```typescript
// Before (비동기 - 작동 안함)
const child = spawn(claudeCommand, args, { shell: true });
child.stdout.on('data', (data) => { /* 이벤트 발생 안함 */ });

// After (동기 - 정상 작동)
const result = execSync(fullCommand, {
  cwd: workingDirectory,
  encoding: 'utf-8',
  timeout: 300000,
  maxBuffer: 50 * 1024 * 1024,
});
```

---

## 3. 트러블슈팅

### 3.1 문제 발견 과정

```
[Timeline]
1. 채팅 탭에서 "세션 시작" 클릭
2. "Claude가 응답 중..." 메시지 표시
3. 무한 대기 상태 (응답 없음)
4. 서버 로그 확인 → spawn 이벤트 발생하지 않음
```

### 3.2 디버깅 전략

#### Step 1: 기본 spawn 테스트

`/api/test-spawn` 엔드포인트 생성하여 기본 spawn 동작 확인

```typescript
// test-spawn/route.ts
const child = spawn('cmd.exe', ['/c', 'echo', 'Hello']);
// 결과: ✅ 정상 작동
```

#### Step 2: Claude CLI 테스트

`/api/test-claude` 엔드포인트 생성하여 Claude CLI 동작 확인

```typescript
// 테스트 1: claude --version
execSync('claude --version'); // ✅ 정상 작동

// 테스트 2: claude --print (spawn)
spawn('claude', ['--print', 'hello']); // ❌ 무한 대기

// 테스트 3: claude --print (execSync)
execSync('claude --print hello'); // ✅ 정상 작동
```

#### Step 3: 원인 분석

| 방식 | 명령어 | 결과 |
|------|--------|------|
| `spawn` | `echo hello` | ✅ 작동 |
| `spawn` | `claude --version` | ✅ 작동 |
| `spawn` | `claude --print hello` | ❌ 무한 대기 |
| `execSync` | `claude --print hello` | ✅ 작동 |

**결론**: Next.js API 라우트 환경에서 Claude CLI의 `--print` 모드는 비동기 spawn과 호환되지 않음

### 3.3 근본 원인

Claude CLI의 `--print` 모드는 내부적으로 특수한 I/O 처리를 수행하며, Next.js의 API 라우트 환경에서 비동기 child process의 stdout 스트림과 충돌 발생

**가설**:
- Claude CLI가 TTY 감지 로직 사용
- Next.js API 라우트의 비동기 환경에서 pipe 버퍼링 이슈
- Windows 환경의 console handle 문제

---

## 4. 핵심 구현 내용

### 4.1 SessionManager 클래스 구조

```typescript
// frontend/lib/sessionManager.ts

import { execSync } from 'child_process';
import { EventEmitter } from 'events';

// 메시지 타입 정의
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

// 세션 타입 정의
export interface TaskSession {
  taskId: string;
  sessionId: string | null;  // Claude의 --resume 세션 ID
  messages: ConversationMessage[];
  isActive: boolean;
  startedAt: string;
  lastActivityAt: string;
  workingDirectory?: string;
}

// 세션 이벤트 타입
export type SessionEvent =
  | { type: 'message'; taskId: string; message: ConversationMessage }
  | { type: 'stream'; taskId: string; content: string; messageId: string }
  | { type: 'stream-end'; taskId: string; messageId: string }
  | { type: 'session-started'; taskId: string; sessionId: string }
  | { type: 'session-ended'; taskId: string }
  | { type: 'error'; taskId: string; error: string };

class SessionManager extends EventEmitter {
  private sessions: Map<string, TaskSession> = new Map();
  private runningTasks: Set<string> = new Set();

  // ... 메서드 구현
}

export const sessionManager = new SessionManager();
```

### 4.2 Claude 명령어 실행 로직

```typescript
private async executeClaudeCommand(
  taskId: string,
  prompt: string,
  workingDirectory: string
): Promise<void> {
  const session = this.sessions.get(taskId);

  // 1. 사용자 메시지 추가
  const userMessage: ConversationMessage = {
    id: this.generateId(),
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMessage);
  this.emit('event', { type: 'message', taskId, message: userMessage });

  // 2. Assistant placeholder 생성
  const assistantMessageId = this.generateId();
  const assistantMessage: ConversationMessage = {
    id: assistantMessageId,
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
    isStreaming: true,
  };
  session.messages.push(assistantMessage);

  // 3. Claude CLI 실행
  const claudeCommand = process.env.CLAUDE_CODE_PATH || 'claude';
  const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  let args = ['--print', '--dangerously-skip-permissions'];
  if (session.sessionId) {
    args.push('--resume', session.sessionId);
  }

  const fullCommand = `${claudeCommand} ${args.join(' ')} "${escapedPrompt}"`;

  try {
    const result = execSync(fullCommand, {
      cwd: workingDirectory,
      encoding: 'utf-8',
      timeout: 300000,  // 5분 타임아웃
      maxBuffer: 50 * 1024 * 1024,  // 50MB 버퍼
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
    });

    // 4. 응답 처리
    assistantMessage.content = result || 'No response from Claude';
    assistantMessage.isStreaming = false;

    this.emit('event', {
      type: 'stream',
      taskId,
      content: assistantMessage.content,
      messageId: assistantMessageId,
    });

    this.emit('event', {
      type: 'stream-end',
      taskId,
      messageId: assistantMessageId,
    });

  } catch (error: any) {
    assistantMessage.content = `오류 발생: ${error.message}`;
    assistantMessage.isStreaming = false;
    this.emit('event', { type: 'error', taskId, error: error.message });
  }
}
```

### 4.3 API 라우트 구현

```typescript
// frontend/app/api/ai/session/route.ts

export async function POST(request: NextRequest) {
  const { action, taskId, message } = await request.json();

  switch (action) {
    case 'start': {
      const workingDir = process.cwd();  // 프로젝트 루트 사용
      await sessionManager.startSession(taskId, task.title, task.rawContent, workingDir);
      return NextResponse.json({ success: true });
    }

    case 'message': {
      await sessionManager.sendMessage(taskId, message);
      return NextResponse.json({ success: true });
    }

    case 'stop': {
      sessionManager.stopSession(taskId);
      return NextResponse.json({ success: true });
    }
  }
}
```

---

## 5. 아키텍처 플로우

### 5.1 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  KanbanBoard │    │  TaskSidebar │    │   ChatPanel  │      │
│  │              │───▶│              │───▶│              │      │
│  │  - Tasks     │    │  - Settings  │    │  - Messages  │      │
│  │  - Columns   │    │  - Chat Tab  │    │  - Input     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                │                 │
│                                                ▼                 │
│                                     ┌──────────────────┐        │
│                                     │  useTaskSession  │        │
│                                     │  (React Hook)    │        │
│                                     └────────┬─────────┘        │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js API Routes)              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  /api/ai/session                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │  start  │  │ message │  │  stop   │  │  clear  │    │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │    │
│  └───────┼────────────┼────────────┼────────────┼──────────┘    │
│          │            │            │            │                │
│          ▼            ▼            ▼            ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   SessionManager                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  sessions: Map<taskId, TaskSession>             │    │    │
│  │  │  runningTasks: Set<taskId>                      │    │    │
│  │  │  EventEmitter (message, stream, error events)   │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └────────────────────────┬────────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      System Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    execSync()                            │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  claude --print --dangerously-skip-permissions   │    │    │
│  │  │         [--resume <sessionId>] "<prompt>"        │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Claude CLI                            │    │
│  │  - AI 응답 생성                                          │    │
│  │  - 세션 컨텍스트 유지 (--resume)                         │    │
│  │  - 파일 시스템 접근 (필요시)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 세션 시작 플로우

```
[User Action]                    [Frontend]                    [Backend]                    [Claude CLI]
     │                               │                             │                             │
     │  Click "세션 시작"            │                             │                             │
     │──────────────────────────────▶│                             │                             │
     │                               │                             │                             │
     │                               │  POST /api/ai/session       │                             │
     │                               │  {action: 'start', taskId}  │                             │
     │                               │────────────────────────────▶│                             │
     │                               │                             │                             │
     │                               │                             │  startSession()             │
     │                               │                             │  - Create TaskSession       │
     │                               │                             │  - Build initial prompt     │
     │                               │                             │                             │
     │                               │                             │  execSync(claude --print)   │
     │                               │                             │────────────────────────────▶│
     │                               │                             │                             │
     │                               │                             │                             │  Process
     │                               │                             │                             │  prompt
     │                               │                             │                             │
     │                               │                             │◀────────────────────────────│
     │                               │                             │  Response text              │
     │                               │                             │                             │
     │                               │                             │  Emit events:               │
     │                               │                             │  - message (user)           │
     │                               │                             │  - message (assistant)      │
     │                               │                             │  - stream                   │
     │                               │                             │  - stream-end               │
     │                               │                             │                             │
     │                               │◀────────────────────────────│                             │
     │                               │  SSE: session events        │                             │
     │                               │                             │                             │
     │                               │  Update UI:                 │                             │
     │                               │  - Show messages            │                             │
     │                               │  - Enable input             │                             │
     │◀──────────────────────────────│                             │                             │
     │  Display conversation         │                             │                             │
```

### 5.3 메시지 전송 플로우

```
[User]          [ChatPanel]        [useTaskSession]       [API]           [SessionManager]      [Claude]
  │                  │                    │                 │                    │                  │
  │ Type message     │                    │                 │                    │                  │
  │ Press Enter      │                    │                 │                    │                  │
  │─────────────────▶│                    │                 │                    │                  │
  │                  │                    │                 │                    │                  │
  │                  │ sendMessage()      │                 │                    │                  │
  │                  │───────────────────▶│                 │                    │                  │
  │                  │                    │                 │                    │                  │
  │                  │                    │ POST /api/ai/   │                    │                  │
  │                  │                    │ session         │                    │                  │
  │                  │                    │────────────────▶│                    │                  │
  │                  │                    │                 │                    │                  │
  │                  │                    │                 │ sendMessage()      │                  │
  │                  │                    │                 │───────────────────▶│                  │
  │                  │                    │                 │                    │                  │
  │                  │                    │                 │                    │ execSync()       │
  │                  │                    │                 │                    │─────────────────▶│
  │                  │                    │                 │                    │                  │
  │                  │                    │                 │                    │◀─────────────────│
  │                  │                    │                 │                    │ Response         │
  │                  │                    │                 │                    │                  │
  │                  │                    │                 │◀───────────────────│                  │
  │                  │                    │                 │ Emit events        │                  │
  │                  │                    │                 │                    │                  │
  │                  │                    │◀────────────────│                    │                  │
  │                  │                    │ SSE events      │                    │                  │
  │                  │                    │                 │                    │                  │
  │                  │◀───────────────────│                 │                    │                  │
  │                  │ Update messages    │                 │                    │                  │
  │                  │                    │                 │                    │                  │
  │◀─────────────────│                    │                 │                    │                  │
  │ Show response    │                    │                 │                    │                  │
```

---

## 6. 참고 자료

### 6.1 Claude CLI 문서

- **Claude Code CLI**: https://docs.anthropic.com/claude-code
- **주요 플래그**:
  - `--print`: 비대화형 모드 (출력만)
  - `--dangerously-skip-permissions`: 권한 확인 건너뛰기
  - `--resume <session-id>`: 이전 세션 이어가기
  - `--verbose`: 상세 출력 모드
  - `--output-format stream-json`: JSON 스트림 출력

### 6.2 Node.js Child Process

- **공식 문서**: https://nodejs.org/api/child_process.html
- **사용된 메서드**:
  - `execSync`: 동기 명령 실행 (채택)
  - `spawn`: 비동기 프로세스 생성 (호환성 문제로 미사용)

### 6.3 Next.js API Routes

- **공식 문서**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Server-Sent Events**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

### 6.4 관련 파일 목록

| 파일 경로 | 설명 |
|-----------|------|
| `frontend/lib/sessionManager.ts` | 세션 관리 핵심 로직 |
| `frontend/app/api/ai/session/route.ts` | 세션 API 엔드포인트 |
| `frontend/hooks/useTaskSession.ts` | React 세션 훅 |
| `frontend/components/task/ChatPanel.tsx` | 채팅 UI 컴포넌트 |
| `frontend/components/task/TaskSidebar.tsx` | 태스크 사이드바 |

---

## 7. 향후 개선 사항

### 7.1 실시간 스트리밍 지원

**현재 한계**: `execSync`는 동기 실행이므로 실시간 스트리밍 불가

**개선 방안**:
1. WebSocket 기반 별도 서버 구현
2. Worker Thread 활용
3. Electron 앱으로 전환하여 직접 프로세스 제어

### 7.2 세션 영속성

**현재 한계**: 서버 재시작 시 세션 데이터 손실

**개선 방안**:
```typescript
// 세션 데이터를 파일로 저장
interface SessionPersistence {
  saveSession(session: TaskSession): Promise<void>;
  loadSession(taskId: string): Promise<TaskSession | null>;
  getAllSessions(): Promise<TaskSession[]>;
}
```

### 7.3 에러 복구 메커니즘

**개선 방안**:
- 자동 재시도 로직
- 세션 체크포인트
- 부분 응답 복구

### 7.4 성능 최적화

**개선 방안**:
- 응답 캐싱
- 요청 디바운싱
- 병렬 세션 제한

---

## 부록: 테스트 엔드포인트

### A.1 Spawn 테스트 (`/api/test-spawn`)

```typescript
// 기본 spawn 동작 확인용
export async function GET(request: NextRequest) {
  const child = spawn('cmd.exe', ['/c', 'echo', 'Hello']);
  // ... 결과 반환
}
```

### A.2 Claude CLI 테스트 (`/api/test-claude`)

```typescript
// Claude CLI execSync 테스트용
export async function GET(request: NextRequest) {
  const result = execSync('claude --print hello', {
    encoding: 'utf-8',
    timeout: 60000,
  });
  return NextResponse.json({ success: true, response: result });
}
```

---

*이 문서는 TaskFlow 프로젝트의 채팅 세션 기능 구현 과정을 기록한 것입니다.*
