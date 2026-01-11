# Product Requirements Document

## 파일 기반 AI 태스크 관리 시스템

---

**Product Name:** TaskFlow (가칭)
**Status:** Draft
**Author:** -
**Date Created:** 2025-01-11
**Last Updated:** 2025-01-11
**Version:** 1.0

---

## Executive Summary

**One-liner:** 로컬 마크다운 파일 기반의 태스크 관리 도구로, AI Agent가 자동으로 작업을 감지하고 수행하는 칸반보드 시스템

**Overview:**

기존 Notion과 같은 클라우드 기반 태스크 관리 도구는 파일이 서버에 저장되어 로컬 접근이 어렵고, AI Agent와의 연동에 제약이 있습니다. TaskFlow는 이 문제를 해결하기 위해 로컬 마크다운 파일을 기반으로 태스크를 관리하며, AI Agent가 파일 시스템을 모니터링하여 자동으로 작업을 수행하고 상태를 업데이트합니다.

사용자는 마크다운 파일의 YAML frontmatter에 `assignee: ai-agent`와 `status: TODO`를 지정하면, AI Agent가 이를 감지하여 작업을 시작하고, 완료 시 자동으로 `IN_REVIEW` 상태로 변경합니다. 웹 칸반보드는 파일 시스템을 실시간으로 트래킹하여 UI를 자동 업데이트합니다.

**Quick Facts:**
- **Target Users:** 개인 개발자, AI Agent 운영자, 일반 사용자 (개발 외 업무 포함)
- **Problem Solved:** 클라우드 종속성 없이 AI Agent와 연동 가능한 로컬 태스크 관리
- **Key Metric:** AI Agent 자동 처리율 (자동 완료된 태스크 / 전체 AI 할당 태스크)
- **Target Launch:** 2주 이내 (MVP)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Objectives](#goals--objectives)
3. [User Personas](#user-personas)
4. [User Stories & Requirements](#user-stories--requirements)
5. [Success Metrics](#success-metrics)
6. [Scope](#scope)
7. [Technical Considerations](#technical-considerations)
8. [Design & UX Requirements](#design--ux-requirements)
9. [Timeline & Milestones](#timeline--milestones)
10. [Risks & Mitigation](#risks--mitigation)
11. [Dependencies & Assumptions](#dependencies--assumptions)
12. [Open Questions](#open-questions)

---

## Problem Statement

### The Problem

Notion, Trello 등 기존 태스크 관리 도구는 파일이 클라우드 서버에 저장되어 있어:
1. 로컬에서 자유로운 파일 관리가 불가능
2. AI Agent가 직접 태스크 파일을 수정하기 어려움
3. 버전 관리(Git)와 통합 불가
4. 오프라인 환경에서 제한적 사용

### Current State

현재 사용자들은 다음과 같은 방식으로 문제를 우회:
- Notion API를 통한 간접적인 연동 (복잡하고 제한적)
- 별도의 로컬 메모/파일과 Notion을 이중 관리
- AI Agent 작업 결과를 수동으로 Notion에 복사

### Impact

**User Impact:**
- AI Agent 작업 결과를 수동으로 태스크 시스템에 반영하는 데 시간 소요
- 파일 시스템과 태스크 관리 시스템 간 불일치 발생
- 버전 히스토리 추적 어려움

**Business Impact:**
- AI Agent 자동화의 잠재력을 충분히 활용하지 못함
- 수동 작업으로 인한 생산성 저하

### Why Now?

- Claude Code, OpenCode 등 AI Agent 도구의 발전으로 자동화 가능성 증가
- 로컬 파일 기반 워크플로우에 대한 개발자 수요 증가
- 기존 olly-molly 프로젝트의 칸반보드 구현 경험 활용 가능

---

## Goals & Objectives

### Business Goals

1. **로컬 파일 완전 제어:** 사용자가 태스크 파일을 Git으로 버전 관리하고 자유롭게 백업/마이그레이션 가능
2. **AI Agent 자동화 극대화:** 반복 작업을 AI에게 위임하고 결과만 검토하는 워크플로우 구현
3. **유연한 확장성:** 다양한 AI Agent, 스크립트, CLI 도구와 쉽게 연동

### User Goals

1. **간편한 태스크 정의:** 마크다운 파일 하나로 태스크를 정의하고 AI에게 할당
2. **자동 상태 동기화:** AI Agent 작업 완료 시 자동으로 상태 업데이트
3. **시각적 관리:** 칸반보드 UI로 전체 태스크 현황 파악

### Non-Goals

- 복잡한 프로젝트 관리 기능 (간트 차트, 리소스 관리 등)
- 팀 협업 기능 (MVP에서는 개인 사용 집중)
- 모바일 앱 지원
- 클라우드 동기화 기능

---

## User Personas

### Primary Persona: AI-Assisted 개인 개발자

**Demographics:**
- 나이: 25-40세
- 역할: 개인 개발자, 프리랜서, 사이드 프로젝트 운영자
- 기술 숙련도: High
- 환경: 로컬 개발 환경 + Claude Code/OpenCode 사용

**Behaviors:**
- 반복적인 개발 작업을 AI Agent에게 위임하고 싶어함
- 파일 시스템과 터미널 기반 워크플로우 선호
- Git을 통한 버전 관리에 익숙

**Needs & Motivations:**
- 태스크를 정의하고 AI가 알아서 처리해주길 원함
- 결과물만 검토하고 빠르게 피드백 반영
- 모든 것을 로컬에서 제어하고 싶음

**Pain Points:**
- Notion 등 클라우드 도구에서 AI Agent 연동 어려움
- 수동으로 AI 작업 결과를 태스크 시스템에 반영하는 번거로움
- 파일이 클라우드에 있어 자유로운 관리 불가

**Quote:** _"AI한테 '이거 해줘'라고 파일에 적어두면 알아서 하고 완료 표시까지 해줬으면 좋겠어"_

### Secondary Persona: 일반 사용자 (비개발자)

**Demographics:**
- 역할: 콘텐츠 크리에이터, 기획자, 일반 사용자
- 기술 숙련도: Medium
- 환경: 마크다운 편집기 사용

**Needs & Motivations:**
- 개발 외 일반 업무도 AI에게 위임하고 싶음
- 간단한 마크다운 문법만으로 태스크 관리
- 시각적인 진행 상황 확인

**Pain Points:**
- 기존 도구들이 개발자 중심으로 설계됨
- AI 연동이 복잡함

---

## User Stories & Requirements

### Epic 1: 마크다운 기반 태스크 관리

#### Must-Have Stories (P0)

##### Story 1: 태스크 파일 생성

**User Story:**
```
As a 사용자,
I want to 마크다운 파일로 태스크를 정의하고,
So that AI Agent가 자동으로 작업을 인식할 수 있다.
```

**Acceptance Criteria:**
- [ ] YAML frontmatter로 메타데이터 정의 가능 (id, title, status, priority, assignee, tags)
- [ ] status 값: TODO, IN_PROGRESS, IN_REVIEW, NEED_FIX, COMPLETE, ON_HOLD
- [ ] priority 값: LOW, MEDIUM, HIGH, URGENT
- [ ] assignee에 "ai-agent" 지정 시 AI 작업 대상으로 인식

**Priority:** Must Have (P0)
**Effort:** S

---

##### Story 2: 칸반보드 UI 렌더링

**User Story:**
```
As a 사용자,
I want to 웹 칸반보드에서 태스크들을 시각적으로 확인하고,
So that 전체 작업 현황을 한눈에 파악할 수 있다.
```

**Acceptance Criteria:**
- [ ] 지정된 폴더의 .md 파일들을 스캔하여 칸반보드에 표시
- [ ] 6개 컬럼 (TODO, IN_PROGRESS, IN_REVIEW, NEED_FIX, COMPLETE, ON_HOLD)
- [ ] 각 태스크 카드에 제목, 우선순위, 할당자 표시
- [ ] 드래그앤드롭으로 태스크 이동 가능

**Priority:** Must Have (P0)
**Effort:** M

---

##### Story 3: 파일 시스템 실시간 동기화

**User Story:**
```
As a 사용자,
I want to 파일 변경 시 칸반보드가 자동으로 업데이트되고,
So that 별도 새로고침 없이 최신 상태를 확인할 수 있다.
```

**Acceptance Criteria:**
- [ ] 파일 시스템 변경 감지 (chokidar 또는 fs.watch)
- [ ] 파일 추가/수정/삭제 시 UI 자동 반영
- [ ] 드래그앤드롭 시 해당 .md 파일의 frontmatter status 자동 수정

**Priority:** Must Have (P0)
**Effort:** M

---

##### Story 4: 태스크 상세 보기/편집

**User Story:**
```
As a 사용자,
I want to 태스크 카드를 클릭하여 상세 내용을 보고 편집할 수 있고,
So that 태스크의 세부 요구사항을 확인하고 수정할 수 있다.
```

**Acceptance Criteria:**
- [ ] 태스크 클릭 시 사이드바 또는 모달로 상세 내용 표시
- [ ] frontmatter 필드 편집 가능 (status, priority, assignee 등)
- [ ] 마크다운 본문 편집 가능
- [ ] 저장 시 .md 파일 직접 업데이트

**Priority:** Must Have (P0)
**Effort:** M

---

### Epic 2: AI Agent 연동

#### Must-Have Stories (P0)

##### Story 5: AI Agent 태스크 감지

**User Story:**
```
As an AI Agent (Claude Code),
I want to 폴더를 스캔하여 내가 처리할 태스크를 찾고,
So that 자동으로 작업을 시작할 수 있다.
```

**Acceptance Criteria:**
- [ ] `assignee: ai-agent` + `status: TODO` 조건의 파일 감지
- [ ] 작업 시작 시 status를 IN_PROGRESS로 변경
- [ ] 작업 완료 시 status를 IN_REVIEW로 변경
- [ ] 작업 로그/결과를 마크다운 본문에 추가

**Priority:** Must Have (P0)
**Effort:** L

---

##### Story 6: 피드백 반영 재작업

**User Story:**
```
As a 사용자,
I want to NEED_FIX 상태의 태스크에 피드백을 작성하면 AI가 재작업하고,
So that 수정 사항을 쉽게 반영할 수 있다.
```

**Acceptance Criteria:**
- [ ] NEED_FIX 상태 + assignee: ai-agent인 태스크 감지
- [ ] 피드백 섹션(## Feedback)의 내용을 참고하여 재작업
- [ ] 재작업 완료 시 IN_REVIEW로 상태 변경

**Priority:** Must Have (P0)
**Effort:** M

---

#### Should-Have Stories (P1)

##### Story 7: Claude Code 직접 실행

**User Story:**
```
As a 사용자,
I want to 칸반보드 UI에서 버튼 클릭으로 Claude Code를 실행하고,
So that 수동으로 CLI를 열지 않아도 AI 작업을 시작할 수 있다.
```

**Acceptance Criteria:**
- [ ] 태스크 상세 화면에 "AI로 작업 실행" 버튼
- [ ] 클릭 시 해당 태스크 내용을 Claude Code에 전달하여 실행
- [ ] 실행 상태 표시 (Running, Completed, Failed)

**Priority:** Should Have (P1)
**Effort:** M

---

### Epic 3: 태스크 필터링 및 검색

#### Should-Have Stories (P1)

##### Story 8: 태스크 필터링

**User Story:**
```
As a 사용자,
I want to 우선순위, 태그, 할당자로 태스크를 필터링하고,
So that 원하는 태스크만 집중해서 볼 수 있다.
```

**Acceptance Criteria:**
- [ ] 우선순위별 필터 (LOW, MEDIUM, HIGH, URGENT)
- [ ] 태그별 필터
- [ ] 할당자별 필터 (ai-agent, 본인 등)
- [ ] 다중 필터 조합 가능

**Priority:** Should Have (P1)
**Effort:** S

---

### Functional Requirements

| Req ID | Description | Priority | Status |
|--------|-------------|----------|--------|
| FR-001 | YAML frontmatter 기반 태스크 메타데이터 파싱 | Must Have | Open |
| FR-002 | 6단계 상태 관리 (TODO → COMPLETE) | Must Have | Open |
| FR-003 | 드래그앤드롭 칸반보드 UI | Must Have | Open |
| FR-004 | 파일 시스템 실시간 watch | Must Have | Open |
| FR-005 | 마크다운 파일 읽기/쓰기 (frontmatter 수정) | Must Have | Open |
| FR-006 | AI Agent 연동 API/CLI 인터페이스 | Must Have | Open |
| FR-007 | 태스크 필터링 및 검색 | Should Have | Open |
| FR-008 | 다크 모드 지원 | Nice to Have | Open |

### Non-Functional Requirements

| Req ID | Category | Description | Target |
|--------|----------|-------------|--------|
| NFR-001 | Performance | 폴더 스캔 및 UI 렌더링 | < 1초 (100개 태스크 기준) |
| NFR-002 | Performance | 파일 변경 감지 → UI 반영 | < 500ms |
| NFR-003 | Usability | 마크다운 문법만으로 태스크 정의 가능 | 100% |
| NFR-004 | Compatibility | macOS, Linux, Windows 지원 | 모든 플랫폼 |
| NFR-005 | Offline | 오프라인 환경에서 완전 동작 | 100% |

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Primary Metric (North Star)

**Metric:** AI Agent 자동 처리율
**Definition:** (AI가 자동 완료한 태스크 수) / (AI에게 할당된 전체 태스크 수) × 100
**Current Baseline:** N/A (신규)
**Target:** 80% (MVP 출시 후 1개월)
**Why This Metric:** AI 자동화의 핵심 가치를 측정

#### Secondary Metrics

| Metric | Current | Target | Timeframe |
|--------|---------|--------|-----------|
| 일일 생성 태스크 수 | N/A | 10+ | MVP 후 2주 |
| 평균 태스크 처리 시간 (AI) | N/A | < 5분 | MVP 후 1개월 |
| 사용자 수동 개입률 | N/A | < 20% | MVP 후 1개월 |

### Measurement Framework

**Framework Used:** Custom (Task Automation Focus)

**Adoption:**
- 일일 활성 사용 여부
- 생성된 태스크 파일 수

**Automation:**
- AI 자동 처리율
- 수동 개입 필요 비율

**Efficiency:**
- 태스크 생성 → 완료 평균 시간
- NEED_FIX 발생률 (AI 품질 지표)

---

## Scope

### In Scope

**Phase 1 (MVP - 2주):**
- 마크다운 파일 기반 태스크 정의 및 파싱
- 6단계 상태 관리 칸반보드 UI
- 파일 시스템 실시간 동기화
- 드래그앤드롭 상태 변경 → 파일 업데이트
- Claude Code 연동을 위한 가이드/스크립트

**Phase 2 (Post-MVP):**
- 칸반보드에서 직접 Claude Code 실행
- 태스크 필터링 및 검색
- 다크 모드
- 키보드 단축키

### Out of Scope

**Explicitly Excluded:**
- 팀 협업 기능 (공유, 권한 관리) - 개인 사용에 집중
- 모바일 앱 - 웹 우선
- 클라우드 동기화 - 로컬 파일 철학 유지
- 복잡한 프로젝트 관리 (간트 차트, 의존성 관리)
- Notion/Jira 등 외부 서비스 연동

### Future Considerations

**Potential Future Enhancements:**
- 다양한 AI Agent 지원 (OpenCode, Cursor 등)
- 태스크 템플릿 기능
- 통계 대시보드 (완료율, 생산성 지표)
- VS Code 확장 프로그램

---

## Technical Considerations

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Next.js Web Application                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Kanban UI  │  │  Task Modal │  │  File Watcher   │  │
│  │  (dnd-kit)  │  │  (Editor)   │  │  (chokidar)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│                          ↕                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │                   API Routes                        ││
│  │  /api/tasks (CRUD)  │  /api/files (watch)          ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                          ↕ File System
┌─────────────────────────────────────────────────────────┐
│              Local File System (MD files)               │
│  /tasks/task-001.md, /tasks/task-002.md, ...           │
└─────────────────────────────────────────────────────────┘
                          ↕ File Monitoring/Edit
┌─────────────────────────────────────────────────────────┐
│                     AI Agent                            │
│  (Claude Code CLI - 독립 실행, 파일 직접 수정)           │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18
- TypeScript
- @dnd-kit (드래그앤드롭)
- Tailwind CSS
- gray-matter (frontmatter 파싱)

**Backend (Next.js API Routes):**
- Node.js
- chokidar (파일 시스템 watch)
- fs/promises (파일 읽기/쓰기)

**Infrastructure:**
- 로컬 실행 (npm run dev)
- 선택적 Electron 패키징 (향후)

### API Requirements

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | 지정 폴더의 모든 태스크 조회 |
| GET | `/api/tasks/:id` | 특정 태스크 상세 조회 |
| PUT | `/api/tasks/:id` | 태스크 메타데이터 수정 (frontmatter) |
| POST | `/api/tasks` | 새 태스크 파일 생성 |
| DELETE | `/api/tasks/:id` | 태스크 파일 삭제 |
| GET | `/api/watch` | SSE 엔드포인트 (파일 변경 실시간 알림) |

### Data Model

**Task (마크다운 파일 구조):**

```yaml
---
id: task-001
title: API 엔드포인트 구현
status: TODO | IN_PROGRESS | IN_REVIEW | NEED_FIX | COMPLETE | ON_HOLD
priority: LOW | MEDIUM | HIGH | URGENT
assignee: ai-agent | user
created_at: 2025-01-11
updated_at: 2025-01-11
tags: [backend, api]
---

## Description
태스크 상세 설명...

## Requirements
- 요구사항 1
- 요구사항 2

## Feedback
(사용자 피드백 - NEED_FIX 시 AI가 참조)

## AI Work Log
(AI Agent가 작업 결과 기록)
```

---

## Design & UX Requirements

### User Experience Principles

1. **단순함:** 복잡한 설정 없이 폴더 지정만으로 시작
2. **투명함:** 파일 시스템의 변경이 그대로 UI에 반영
3. **빠름:** 드래그앤드롭, 키보드 단축키로 빠른 조작

### User Flows

**Primary Flow: AI 태스크 자동 처리**
1. 사용자가 .md 파일 생성 (status: TODO, assignee: ai-agent)
2. 칸반보드 UI에 TODO 컬럼에 태스크 표시
3. AI Agent가 파일 감지 → status를 IN_PROGRESS로 변경
4. UI 자동 업데이트 (IN_PROGRESS 컬럼으로 이동)
5. AI Agent 작업 완료 → status를 IN_REVIEW로 변경
6. UI 자동 업데이트 (IN_REVIEW 컬럼으로 이동)
7. 사용자 검토 후 드래그앤드롭으로 COMPLETE 또는 NEED_FIX로 이동

### Visual Design

**Design Principles:**
- olly-molly 프로젝트 스타일 참고
- 미니멀한 인터페이스
- 상태별 컬러 코딩

**Column Colors:**
| Status | Color | Icon |
|--------|-------|------|
| TODO | Gray | 📋 |
| IN_PROGRESS | Blue | 🔄 |
| IN_REVIEW | Purple | 👀 |
| NEED_FIX | Orange | 🛠️ |
| COMPLETE | Green | ✅ |
| ON_HOLD | Amber | ⏸️ |

### Accessibility (a11y)

- 키보드 네비게이션 지원 (dnd-kit 기본 제공)
- 충분한 색상 대비
- 스크린 리더 호환

---

## Timeline & Milestones

**Target Launch Date:** 2025-01-25 (MVP)

### Phases

| Phase | Deliverables | Duration |
|-------|-------------|----------|
| **Week 1** | 프로젝트 셋업, 파일 파싱, 기본 칸반보드 UI | 7일 |
| **Week 2** | 파일 동기화, 드래그앤드롭, AI Agent 가이드 | 7일 |
| **Post-MVP** | 필터링, 직접 실행 기능, 개선 | 지속 |

### Key Milestones

- **Day 1-2:** 프로젝트 초기 셋업, 기술 스택 구성
- **Day 3-5:** 마크다운 파싱, 기본 칸반보드 UI
- **Day 6-7:** 파일 시스템 watch, 실시간 동기화
- **Day 8-10:** 드래그앤드롭 → 파일 수정 연동
- **Day 11-12:** 태스크 상세/편집 UI
- **Day 13-14:** AI Agent 연동 가이드, 테스트, 버그 수정

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|------------|---------------------|
| 파일 시스템 watch 성능 이슈 (대량 파일) | Medium | Low | 폴더 depth 제한, debounce 적용 |
| 동시 수정 충돌 (UI와 AI Agent) | High | Medium | 파일 잠금 메커니즘, 충돌 감지 알림 |
| 크로스 플랫폼 경로 이슈 | Medium | Medium | path 모듈 사용, 플랫폼별 테스트 |
| frontmatter 파싱 오류 | Low | Low | gray-matter 라이브러리 사용, 에러 핸들링 |

---

## Dependencies & Assumptions

### Dependencies

**Internal:**
- [ ] Next.js 프로젝트 초기 셋업
- [ ] dnd-kit 라이브러리 학습 (olly-molly 참고)

**External:**
- [ ] Claude Code CLI 설치 및 동작 확인
- [ ] Node.js 18+ 환경

### Assumptions

- 사용자는 마크다운 문법에 익숙함
- 사용자는 Claude Code 또는 유사 AI Agent를 이미 사용 중
- 태스크 폴더는 단일 폴더 (중첩 폴더 미지원 - MVP)
- 동시에 하나의 AI Agent만 동작 (MVP)

---

## Open Questions

- [ ] **태스크 파일 저장 위치 설정 방식**
  - Options: 설정 파일, 환경 변수, UI에서 선택
  - Owner: 개발 시 결정
  - Deadline: Week 1

- [ ] **AI Agent 실행 방식**
  - Options:
    1. 사용자가 별도로 Claude Code 실행 (MVP)
    2. 웹 UI에서 버튼으로 실행 (Post-MVP)
  - Owner: 개발 시 결정
  - Deadline: Week 1

- [ ] **다중 AI Agent 지원 여부 (MVP 이후)**
  - Options: assignee 필드 확장, agent 설정 파일
  - Owner: 추후 결정

---

## Appendix

### 참고 프로젝트

- **olly-molly:** 칸반보드 UI 및 dnd-kit 구현 참고
  - 경로: `/Users/jiwonp/project/olly-molly`
  - 주요 파일: `components/kanban/KanbanBoard.tsx`

### 마크다운 태스크 파일 예시

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

JWT 기반 사용자 인증 API를 구현합니다.

## Requirements

- POST /api/auth/login - 로그인 엔드포인트
- POST /api/auth/logout - 로그아웃 엔드포인트
- POST /api/auth/refresh - 토큰 갱신
- 비밀번호 해싱 (bcrypt)
- Access Token 만료: 15분
- Refresh Token 만료: 7일

## Technical Notes

- 기존 User 모델 활용
- middleware로 인증 검증

## Feedback

(검토 후 수정 필요 시 여기에 작성)

## AI Work Log

(AI Agent가 작업 내용 기록)
```

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-11 | - | Initial draft |
