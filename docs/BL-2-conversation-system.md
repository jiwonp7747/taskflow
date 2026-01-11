# BL-2: 대화형 AI 세션 시스템

## 개요

태스크별로 Claude와 대화형 세션을 유지하여 작업을 수행하는 시스템입니다.
기존의 일회성 실행 방식(`--print` 모드)에서 대화형 방식으로 전환하여,
사용자가 Claude와 실시간으로 소통하며 태스크를 완료할 수 있습니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────────────┐  │
│  │  TaskBoard   │───▶│ ConversationPanel │◀──▶│  useConversation     │  │
│  │  (칸반보드)   │    │   (대화 UI)        │    │     (훅)             │  │
│  └──────────────┘    └───────────────────┘    └──────────────────────┘  │
│         │                      │                        │                │
│         ▼                      │                        ▼                │
│  AI 태스크 클릭                 │                  SSE 연결              │
│                                │                        │                │
└────────────────────────────────│────────────────────────│────────────────┘
                                 │                        │
                                 ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Backend (Next.js API)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐         ┌──────────────────────────────────┐  │
│  │  /api/ai/session     │────────▶│      SessionManager              │  │
│  │  (REST + SSE API)    │         │   (세션 관리 싱글톤)               │  │
│  └──────────────────────┘         └──────────────────────────────────┘  │
│                                              │                           │
│                                              ▼                           │
│                                   ┌──────────────────────────────────┐  │
│                                   │     Claude CLI Process           │  │
│                                   │  (stdin/stdout 양방향 통신)        │  │
│                                   └──────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 파일 구조

```
frontend/
├── lib/
│   └── sessionManager.ts      # 세션 관리 핵심 로직
├── hooks/
│   └── useConversation.ts     # 클라이언트 훅
├── components/ai/
│   ├── AIStatusBar.tsx        # AI 상태 표시 (터미널 제거됨)
│   └── ConversationPanel.tsx  # 대화 UI 패널
├── app/
│   ├── page.tsx               # 메인 페이지 (ConversationPanel 통합)
│   └── api/ai/session/
│       └── route.ts           # 세션 API 엔드포인트
```

## 핵심 컴포넌트

### 1. SessionManager (`lib/sessionManager.ts`)

태스크별 Claude 세션을 관리하는 싱글톤 클래스입니다.

#### 주요 기능

| 메서드 | 설명 |
|--------|------|
| `getSession(taskId)` | 태스크의 세션 정보 조회 |
| `startSession(taskId, ...)` | 새 세션 시작 또는 기존 세션 재개 |
| `sendMessage(taskId, content)` | 메시지 전송 |
| `stopSession(taskId)` | 세션 종료 (프로세스 종료) |
| `clearSession(taskId)` | 세션 데이터 삭제 |

#### 데이터 구조

```typescript
interface TaskSession {
  taskId: string;
  sessionId: string | null;  // Claude의 --resume용 세션 ID
  messages: ConversationMessage[];
  isActive: boolean;
  startedAt: string;
  lastActivityAt: string;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}
```

#### 이벤트 시스템

SessionManager는 EventEmitter를 상속하여 실시간 이벤트를 발생시킵니다:

```typescript
type SessionEvent =
  | { type: 'message'; taskId: string; message: ConversationMessage }
  | { type: 'stream'; taskId: string; content: string; messageId: string }
  | { type: 'stream-end'; taskId: string; messageId: string }
  | { type: 'session-started'; taskId: string; sessionId: string }
  | { type: 'session-ended'; taskId: string }
  | { type: 'error'; taskId: string; error: string };
```

### 2. Session API (`app/api/ai/session/route.ts`)

#### 엔드포인트

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/ai/session?taskId=xxx` | 세션 정보 조회 |
| GET | `/api/ai/session?stream=true&taskId=xxx` | SSE 이벤트 스트림 |
| POST | `/api/ai/session` | 세션 제어 (action 기반) |

#### POST Actions

```typescript
// 세션 시작
{ action: 'start', taskId: 'task-123' }

// 메시지 전송
{ action: 'message', taskId: 'task-123', message: '추가 작업해주세요' }

// 세션 종료
{ action: 'stop', taskId: 'task-123' }

// 세션 삭제
{ action: 'clear', taskId: 'task-123' }
```

### 3. useConversation Hook (`hooks/useConversation.ts`)

클라이언트에서 세션을 관리하는 React 훅입니다.

```typescript
const {
  messages,           // 대화 메시지 배열
  isSessionActive,    // 세션 활성 상태
  isConnected,        // SSE 연결 상태
  startSession,       // 세션 시작 함수
  sendMessage,        // 메시지 전송 함수
  stopSession,        // 세션 종료 함수
  clearSession,       // 세션 삭제 함수
  loadSession,        // 세션 로드 함수
} = useConversation(currentTaskId);
```

### 4. ConversationPanel (`components/ai/ConversationPanel.tsx`)

대화 UI를 표시하는 컴포넌트입니다.

#### Props

```typescript
interface ConversationPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  messages: ConversationMessage[];
  isSessionActive: boolean;
  onStartSession: (taskId: string) => Promise<void>;
  onSendMessage: (taskId: string, message: string) => void;
  onStopSession: (taskId: string) => void;
}
```

#### UI 구성

```
┌────────────────────────────────────────────┐
│  [🤖] 태스크 제목                    [X]   │  ← 헤더
│  ● 세션 활성 | 5 메시지                    │
├────────────────────────────────────────────┤
│                                            │
│  ┌─────────────────────────────────────┐  │
│  │ 시스템: 태스크 세션 시작             │  │  ← 메시지 영역
│  └─────────────────────────────────────┘  │
│                                            │
│              ┌─────────────────────────┐  │
│              │ 사용자: 시작해주세요     │  │
│              └─────────────────────────┘  │
│                                            │
│  ┌─────────────────────────────────────┐  │
│  │ Claude: 네, 태스크를 분석했습니다.  │  │
│  │ 다음과 같이 진행하겠습니다...       │  │
│  │ ● 입력 중...                        │  │
│  └─────────────────────────────────────┘  │
│                                            │
├────────────────────────────────────────────┤
│  [메시지 입력...]              [전송 ▶]   │  ← 입력 영역
└────────────────────────────────────────────┘
```

## 사용 플로우

### 1. 세션 시작

```
사용자: AI 에이전트 태스크 클릭
    ↓
시스템: ConversationPanel 열림
    ↓
사용자: "세션 시작" 버튼 클릭
    ↓
시스템: POST /api/ai/session { action: 'start', taskId }
    ↓
SessionManager: Claude 프로세스 spawn
    ↓
SessionManager: 초기 프롬프트 전송 (태스크 내용 포함)
    ↓
Claude: 작업 계획 응답 (실시간 스트리밍)
```

### 2. 대화 진행

```
사용자: 메시지 입력 후 Enter
    ↓
useConversation: POST /api/ai/session { action: 'message', taskId, message }
    ↓
SessionManager: stdin으로 메시지 전송
    ↓
Claude: stdout으로 응답 출력
    ↓
SessionManager: 'stream' 이벤트 발생
    ↓
SSE: 클라이언트로 스트리밍
    ↓
ConversationPanel: 실시간 메시지 업데이트
```

### 3. 세션 재개

```
사용자: 이전에 작업하던 태스크 클릭
    ↓
시스템: 저장된 sessionId 확인
    ↓
사용자: "세션 재시작" 버튼 클릭
    ↓
SessionManager: claude --resume {sessionId} 로 프로세스 시작
    ↓
Claude: 이전 대화 컨텍스트 유지한 채 재개
```

## 기존 시스템과의 차이점

| 항목 | 기존 (--print 모드) | 신규 (대화형) |
|------|---------------------|---------------|
| 실행 방식 | 일회성 실행 | 지속적 세션 |
| 사용자 상호작용 | 불가능 | 실시간 대화 |
| 컨텍스트 유지 | 불가능 | --resume으로 가능 |
| UI | 터미널 로그 | 채팅 형태 |
| 피드백 반영 | 새 실행 필요 | 즉시 대화로 전달 |

## 환경 변수

```bash
# Claude CLI 경로 (기본값: 'claude')
CLAUDE_CODE_PATH=/path/to/claude
```

## 주의사항

1. **동시 세션 제한**: 현재 구현에서는 하나의 Claude 프로세스만 활성화 가능
2. **세션 메모리**: 세션 데이터는 서버 메모리에 저장 (서버 재시작 시 초기화)
3. **프로세스 관리**: 장시간 유휴 세션은 수동으로 종료 필요

## 향후 개선 사항

- [ ] 세션 데이터 영구 저장 (파일 또는 DB)
- [ ] 다중 동시 세션 지원
- [ ] 자동 세션 타임아웃
- [ ] 세션 히스토리 검색
- [ ] 태스크 상태 자동 업데이트 (IN_REVIEW 등)
