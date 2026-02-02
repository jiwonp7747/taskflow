# TaskFlow

로컬 우선, 마크다운 기반의 AI 자동화 태스크 관리 시스템

---

## 개요

**TaskFlow**는 마크다운 파일을 소스 오브 트루스(Source of Truth)로 사용하는 태스크 관리 시스템입니다. 각 태스크는 개별 `.md` 파일로 존재하며, YAML 프론트매터로 메타데이터를 관리합니다. 클라우드 의존성 없이 완전한 오프라인 작업이 가능하며, Git을 통한 버전 관리와 AI 에이전트의 직접적인 파일 조작이 가능합니다.

### 핵심 철학

파일이 곧 진실입니다. 태스크는 디스크에 마크다운 파일로 존재하므로 Git 버전 관리, 오프라인 작업, 클라우드 의존성 없는 AI 에이전트 조작이 가능합니다.

### 주요 특징

**Kanban 보드** - TODO, IN_PROGRESS, IN_REVIEW, NEED_FIX, COMPLETE, ON_HOLD 6개 칼럼으로 구성된 드래그 앤 드롭 보드

**캘린더 뷰** - 월별 캘린더에서 날짜별 태스크 시각화

**타임라인 뷰** - 일별 시간대별 타임라인, 캘린더 날짜 더블클릭으로 접근

**AI 워커** - `ai-agent`로 할당된 태스크를 Claude Code CLI로 자동 실행하고 상태 자동 업데이트

**실시간 파일 동기화** - chokidar가 소스 디렉토리를 감시하여 외부 변경사항 즉시 반영

**멀티 소스** - 여러 태스크 디렉토리 관리, 한 번에 하나씩 활성화

**내장 터미널** - xterm.js + node-pty 기반의 분할 패널 및 탭 지원 풀 PTY 터미널

**태스크 필터링** - 태그, 담당자, 날짜 범위로 필터링

**AI 대화** - 사이드바에서 특정 태스크에 대해 AI와 대화

**CLI 도구** - 터미널 기반 태스크 관리를 위한 npm run ai 명령어

**크로스 플랫폼** - macOS DMG, Windows NSIS, Linux AppImage 지원

---

## 배지

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)

---

## 듀얼 런타임

TaskFlow는 두 가지 런타임 환경을 제공합니다.

### Electron 데스크톱 앱 (주 환경)

SQLite, 내장 터미널, 시스템 트레이, 네이티브 메뉴를 갖춘 완전한 기능의 데스크톱 애플리케이션

### Next.js 웹 앱 (보조 환경)

HTTP API 라우트와 SSE를 사용하는 브라우저 기반 버전

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 데스크톱 런타임 | Electron 35 |
| 웹 런타임 | Next.js 16 (App Router) |
| 프론트엔드 | React 19, TypeScript 5 |
| 빌드 (Electron) | Vite 6 + vite-plugin-electron |
| 스타일링 | Tailwind CSS 4 |
| 드래그 앤 드롭 | @dnd-kit |
| 데이터베이스 | better-sqlite3 (Electron), JSON 파일 (Web) |
| 마크다운 파싱 | gray-matter |
| 파일 감시 | chokidar 5 |
| 터미널 | xterm.js 5, node-pty |
| 테스팅 | Playwright |
| 패키징 | electron-builder |
| AI | Claude Code CLI |

---

## 프로젝트 구조

```
taskflow/
├── frontend/                 # 메인 애플리케이션
│   ├── electron/             # Electron 메인 프로세스
│   │   ├── main.ts           # 앱 진입점
│   │   ├── preload.ts        # 보안 브리지 (컨텍스트 격리)
│   │   ├── ipc/              # IPC 핸들러 (tasks, config, sources, ai, terminal, dialog, window)
│   │   ├── services/         # 백그라운드 서비스 (database, fileWatcher, aiWorker, claudeExecutor, pty)
│   │   └── lib/              # 유틸리티 (taskParser, fileSystem)
│   ├── src/                  # Electron 렌더러 (React)
│   │   ├── App.tsx           # 루트 컴포넌트
│   │   ├── components/       # TitleBar, Terminal
│   │   └── hooks/            # IPC 기반 훅
│   ├── app/                  # Next.js 웹 앱
│   │   ├── page.tsx          # 웹 UI
│   │   └── api/              # REST API 라우트
│   ├── components/           # 공유 UI 컴포넌트
│   │   ├── kanban/           # TaskBoard, TaskCard, TaskColumn, TaskSidebar, FilterBar
│   │   ├── calendar/         # CalendarView, CalendarDayCell, CalendarWeekRow
│   │   ├── timeline/         # TimelineView, TimelineGrid, TimelineBlock
│   │   ├── sidebar/          # LeftSidebar, SourcePanel
│   │   ├── ai/               # AIStatusBar, ConversationPanel
│   │   └── onboarding/       # WelcomeScreen
│   ├── core/                 # 헥사고날 아키텍처 도메인
│   │   ├── domain/entities/  # Source, Config, AIWorkerConfig
│   │   ├── ports/            # Input/Output 인터페이스
│   │   └── application/      # 서비스 구현
│   ├── adapters/             # 퍼시스턴스 어댑터 (File, SQLite)
│   ├── infrastructure/       # DI 컨테이너, 팩토리
│   ├── types/                # 공유 TypeScript 타입
│   └── scripts/              # CLI 도구 (ai-agent-helper)
└── docs/                     # 문서
    ├── PRD.md                # 제품 요구사항 문서
    ├── SYNC_MECHANISM.md     # 파일 동기화 아키텍처
    └── diagrams/             # 아키텍처 다이어그램
```

---

## 설치 및 실행

### 사전 요구사항

- Node.js 18 이상
- Claude Code CLI (AI 워커 기능 사용 시): `claude --version`으로 설치 확인

### 설치

```bash
# 의존성 설치
cd frontend
npm install
```

### 개발 환경 실행

```bash
# Electron 데스크톱 앱 (주 환경)
npm run dev

# Next.js 웹 앱 (보조 환경)
npm run dev:next
```

### 빌드

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

### 첫 실행

앱을 처음 실행하면 환영 화면이 표시되며, 마크다운 태스크 파일을 저장할 로컬 디렉토리인 "소스"를 설정해야 합니다.

---

## 태스크 파일 형식

각 태스크는 YAML 프론트매터를 포함한 `.md` 파일입니다.

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
```

### 필드 설명

**status 값**

- `TODO` - 해야 할 일
- `IN_PROGRESS` - 진행 중
- `IN_REVIEW` - 검토 중
- `NEED_FIX` - 수정 필요
- `COMPLETE` - 완료
- `ON_HOLD` - 보류

**priority 값**

- `LOW` - 낮음
- `MEDIUM` - 보통
- `HIGH` - 높음
- `URGENT` - 긴급

---

## AI 워커

AI 워커는 `assignee: ai-agent`로 할당되고 `status: TODO` 또는 `NEED_FIX` 상태인 태스크를 폴링하여 Claude Code CLI를 통해 자동으로 실행합니다.

### 실행 플로우

```
TODO → IN_PROGRESS → (Claude Code 실행) → IN_REVIEW (성공) 또는 NEED_FIX (실패)
```

### 제어

앱 하단의 AI 상태 바에서 AI 워커를 제어할 수 있습니다.

### 설정

`.taskflow.config.json` 파일에서 AI 워커를 설정할 수 있습니다.

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

**설정 항목**

- `enabled` - AI 워커 활성화 여부
- `autoStart` - 앱 시작 시 자동 시작 여부
- `pollingInterval` - 폴링 간격 (밀리초)
- `maxConcurrent` - 동시 실행 가능한 최대 태스크 수
- `timeout` - 태스크 실행 타임아웃 (밀리초)

---

## CLI 도구

터미널에서 태스크를 관리할 수 있는 CLI 도구를 제공합니다.

```bash
# AI 할당 태스크 목록 조회
npm run ai:list

# 태스크 시작 (→ IN_PROGRESS)
npm run ai:start <task-id>

# 태스크 완료 (→ IN_REVIEW)
npm run ai -- complete <task-id> "작업 설명"

# 태스크 상세 조회
npm run ai -- show <task-id>
```

---

## 아키텍처

### 핵심 패턴

**헥사고날 아키텍처 (포트 & 어댑터)**

Source 및 Config 관리를 위한 헥사고날 아키텍처 패턴 적용

**Electron 런타임**

- better-sqlite3를 사용한 SQLite 데이터베이스
- IPC를 통한 메인-렌더러 프로세스 간 통신
- 공유 React 컴포넌트

**Next.js 런타임**

- JSON 파일 기반 퍼시스턴스
- REST API + SSE (Server-Sent Events)
- 공유 React 컴포넌트

### 주요 서비스

**chokidar** - 실시간 파일 감시

**node-pty + xterm.js** - 내장 터미널 구현

---

## 관련 문서

- `docs/PRD.md` - 제품 요구사항 문서
- `docs/SYNC_MECHANISM.md` - 파일 동기화 아키텍처
- `docs/specs/hexagonal/ARCHITECTURE.md` - 헥사고날 아키텍처 명세
- `docs/diagrams/` - 아키텍처 다이어그램

---

## 라이선스

MIT

---

## 기여

이슈 제보 및 풀 리퀘스트를 환영합니다.

---

## 문의

프로젝트 관련 문의사항은 이슈를 등록해 주세요.
