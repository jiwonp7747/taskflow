# TaskFlow

로컬 마크다운 파일 기반의 태스크 관리 시스템입니다. Kanban 보드 UI와 AI Agent 자동 실행을 지원합니다.

---

## 목차

1. [시작하기](#시작하기)
   - [Source 설정](#source-설정)
   - [GitHub Source 설정](#github-source-설정-v020)
2. [Task 파일 관리](#task-파일-관리)
3. [AI Agent 사용법](#ai-agent-사용법)
   - [방법 1: 웹 UI에서 자동 실행 (AI Worker)](#방법-1-웹-ui에서-자동-실행-ai-worker)
   - [방법 2: 터미널에서 직접 명령](#방법-2-터미널에서-직접-명령)
4. [설정](#설정)
5. [문제 해결](#문제-해결)

---

## 시작하기

### 설치

```bash
cd frontend
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

### Source 설정

최초 실행 시 태스크를 저장할 폴더를 설정해야 합니다:

1. 좌측 사이드바에서 **"Add Source"** 클릭
2. Source 이름과 경로 입력
3. **"Add"** 버튼 클릭

### GitHub Source 설정 (v0.2.0+)

GitHub 원격 저장소를 태스크 소스로 사용할 수 있습니다:

1. 좌측 사이드바에서 **"+"** 클릭
2. **"GitHub"** 탭 선택
3. 다음 중 하나로 설정:
   - **URL 붙여넣기**: `https://github.com/owner/repo/tree/branch/path` 형식의 URL 입력 시 자동 파싱
   - **직접 입력**: Owner, Repository, Branch, Root Path 개별 입력
4. **Personal Access Token** 입력 (필수)
   - GitHub Settings → Developer settings → Personal access tokens
   - `repo` scope 권한 필요 (private 저장소 접근 시)
5. **"Test Connection"** 클릭하여 연결 확인
6. **"Add GitHub Source"** 클릭

#### 특징

| 기능 | 설명 |
|------|------|
| 재귀 탐색 | 하위 폴더의 모든 `.md` 파일 자동 인식 |
| 병렬 로딩 | 10개씩 배치 병렬 요청으로 빠른 로딩 |
| SHA 캐싱 | 변경 없는 파일은 캐시 사용 (5분 TTL) |
| 자동 파싱 | GitHub URL 붙여넣기 시 owner/repo/branch/path 자동 추출 |

#### 제한 사항

- 현재 읽기 전용 (태스크 생성/수정/삭제 미지원)
- GitHub API Rate Limit: 인증 시 5,000 요청/시간
- 동기화(Sync) 기능은 향후 지원 예정

---

## Task 파일 관리

### 파일 구조

각 태스크는 개별 마크다운(`.md`) 파일로 저장됩니다:

```
tasks/
├── task-001.md
├── task-002.md
└── task-003.md
```

### 태스크 파일 형식

```markdown
---
id: task-001
title: 사용자 인증 API 구현
status: TODO
priority: HIGH
assignee: ai-agent
created_at: 2025-01-11
updated_at: 2025-01-11
tags: [backend, auth, api]
---

## Description

태스크 상세 설명...

## Requirements

- 요구사항 1
- 요구사항 2

## Feedback

(사용자 피드백 - NEED_FIX 시 참조)

## AI Work Log

(AI Agent 작업 내용이 자동으로 기록됨)
```

### Frontmatter 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 태스크 고유 ID (파일명과 동일) |
| `title` | string | 태스크 제목 |
| `status` | string | 상태 (아래 표 참조) |
| `priority` | string | 우선순위: `LOW`, `MEDIUM`, `HIGH` |
| `assignee` | string | 담당자 (`ai-agent` 지정 시 AI가 처리) |
| `tags` | string[] | 태그 목록 |
| `created_at` | date | 생성일 |
| `updated_at` | date | 수정일 |

### 상태 값

| 상태 | 설명 | UI 컬럼 |
|------|------|---------|
| `TODO` | 대기 중 | To Do |
| `IN_PROGRESS` | 진행 중 | In Progress |
| `IN_REVIEW` | 검토 대기 | In Review |
| `NEED_FIX` | 수정 필요 | Need Fix |
| `COMPLETE` | 완료 | Complete |
| `ON_HOLD` | 보류 | On Hold |

---

## AI Agent 사용법

AI Agent가 태스크를 처리하는 두 가지 방법이 있습니다.

### 방법 1: 웹 UI에서 자동 실행 (AI Worker)

웹 애플리케이션에서 AI Worker를 활성화하면, 주기적으로 태스크를 폴링하여 자동으로 실행합니다.

#### 작동 조건

AI Worker가 자동으로 실행하는 태스크 조건:
- `assignee`가 `ai-agent`
- `status`가 `TODO` 또는 `NEED_FIX`

#### 사용 방법

1. **웹 UI 접속**: `http://localhost:3000`
2. **AI Worker 시작**: 우측 하단의 **AI Status Bar**에서 **"Start"** 버튼 클릭
3. **자동 실행**: 30초(기본값) 간격으로 태스크를 스캔하고 자동 실행
4. **실시간 모니터링**: 실행 로그와 상태를 UI에서 확인

#### 실행 흐름

```
1. AI Worker 시작 (UI에서 Start 클릭)
2. 30초마다 태스크 폴링
3. 조건에 맞는 태스크 발견
4. status를 IN_PROGRESS로 변경
5. Claude Code CLI로 태스크 실행
6. 성공 시: IN_REVIEW로 변경 + AI Work Log 기록
7. 실패 시: NEED_FIX로 변경 + 에러 로그 기록
```

#### 설정 변경

`.taskflow.config.json` 파일에서 AI Worker 설정을 변경할 수 있습니다:

```json
{
  "aiWorker": {
    "enabled": true,
    "autoStart": false,
    "pollingInterval": 30000,
    "maxConcurrent": 1,
    "timeout": 600000
  }
}
```

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `enabled` | true | AI Worker 활성화 여부 |
| `autoStart` | false | 앱 시작 시 자동 시작 |
| `pollingInterval` | 30000 | 폴링 간격 (ms) |
| `maxConcurrent` | 1 | 동시 실행 태스크 수 |
| `timeout` | 600000 | 태스크 타임아웃 (ms, 10분) |

#### 로그 확인

브라우저 개발자 도구 콘솔에서 `[AI Worker]` 프리픽스로 로그 확인:

```
[AI Worker] Finding eligible tasks...
[AI Worker] Eligible tasks: [{ id: 'task-001', title: '...' }]
[AI Worker] Executing task: { id: 'task-001', ... }
```

---

### 방법 2: 터미널에서 직접 명령

Claude Code 등 AI Agent가 터미널에서 직접 태스크를 조회하고 처리할 수 있습니다.

#### 태스크 목록 조회

AI가 처리할 태스크 목록 조회 (assignee: ai-agent + status: TODO/NEED_FIX):

```bash
npm run ai:list
```

JSON 형식으로 출력:

```bash
npm run ai -- list --json
```

#### 태스크 상세 보기

```bash
npm run ai -- show <task-id>
```

예시:

```bash
npm run ai -- show task-001
```

#### 작업 시작

태스크 상태를 `IN_PROGRESS`로 변경:

```bash
npm run ai:start <task-id>
```

또는:

```bash
npm run ai -- start task-001
```

#### 작업 완료

태스크 상태를 `IN_REVIEW`로 변경하고 작업 로그 추가:

```bash
npm run ai -- complete <task-id> "작업 내용 설명"
```

예시:

```bash
npm run ai -- complete task-001 "Implemented user authentication with JWT"
```

#### 명령어 옵션

| 옵션 | 설명 |
|------|------|
| `--json` | JSON 형식으로 출력 |
| `--dir <path>` | 태스크 디렉토리 지정 |

#### Claude Code 사용 예시

```
User: TaskFlow에서 내가 할 일을 확인하고 작업해줘

Claude: 먼저 할당된 태스크를 확인하겠습니다.

[실행: npm run ai:list]

task-001이 할당되어 있네요. 작업을 시작하겠습니다.

[실행: npm run ai -- start task-001]

이제 요구사항에 따라 구현하겠습니다...
(코드 구현)

작업이 완료되었습니다.

[실행: npm run ai -- complete task-001 "Implemented the requested feature"]
```

---

## 설정

### 설정 파일

`.taskflow.config.json`:

```json
{
  "sources": [
    {
      "id": "source-xxx",
      "name": "my-tasks",
      "path": "/path/to/tasks",
      "isActive": true,
      "createdAt": "2025-01-11T00:00:00.000Z"
    }
  ],
  "activeSourceId": "source-xxx",
  "theme": "dark",
  "sidebarCollapsed": false,
  "aiWorker": {
    "enabled": true,
    "autoStart": false,
    "pollingInterval": 30000,
    "maxConcurrent": 1,
    "timeout": 600000
  }
}
```

### 동기화 메커니즘

TaskFlow는 두 가지 동기화 방식을 사용합니다:

| 구분 | 파일 동기화 (UI 업데이트) | AI Worker 폴링 |
|------|--------------------------|-----------------|
| 목적 | 파일 변경 시 UI 실시간 반영 | TODO/NEED_FIX 태스크 자동 실행 |
| 방식 | chokidar + SSE | setInterval 폴링 |
| 로그 프리픽스 | `[FileWatcher]` | `[AI Worker]` |

자세한 내용은 [docs/SYNC_MECHANISM.md](../docs/SYNC_MECHANISM.md)를 참조하세요.

---

## 문제 해결

### 태스크가 목록에 안 보여요

- `assignee`가 `ai-agent`인지 확인
- `status`가 `TODO` 또는 `NEED_FIX`인지 확인
- 태스크 폴더 경로가 올바른지 확인

### AI Worker가 실행되지 않아요

- Claude Code CLI가 설치되어 있는지 확인 (`claude --version`)
- `.taskflow.config.json`에서 `aiWorker.enabled`가 `true`인지 확인
- 브라우저 콘솔에서 `[AI Worker]` 로그 확인

### 상태 변경이 안 돼요

- 파일 권한 확인
- frontmatter YAML 문법 오류 확인

### 웹 UI에 반영이 안 돼요

- 웹 UI가 실행 중인지 확인 (`npm run dev`)
- 브라우저 콘솔에서 `[FileWatcher]` 로그 확인
- Live Sync 연결 상태 확인 (헤더의 초록색 점)

---

## 기술 스택

- **Frontend**: Next.js 14+, React, TypeScript
- **UI**: Tailwind CSS, @dnd-kit (드래그앤드롭)
- **File Watching**: chokidar
- **Markdown Parsing**: gray-matter

---

## 관련 문서

- [AI Agent Guide](../docs/AI_AGENT_GUIDE.md) - AI Agent 상세 가이드
- [Sync Mechanism](../docs/SYNC_MECHANISM.md) - 동기화 메커니즘 상세
- [PRD](../docs/PRD.md) - 제품 요구사항 문서
