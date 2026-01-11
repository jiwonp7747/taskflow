# Requirements Document

## TaskFlow - 파일 기반 AI 태스크 관리 시스템

---

**Version:** 1.0
**Last Updated:** 2025-01-11
**Status:** Draft

---

## Introduction

TaskFlow는 로컬 마크다운 파일 기반의 태스크 관리 도구로, AI Agent가 자동으로 작업을 감지하고 수행하는 칸반보드 시스템입니다.

기존 Notion, Trello 등 클라우드 기반 태스크 관리 도구의 한계(로컬 접근 불가, AI Agent 연동 제약, Git 통합 불가)를 해결하여 개인 개발자와 AI Agent 운영자가 효율적으로 태스크를 관리할 수 있게 합니다.

## Alignment with Product Vision

- **로컬 파일 완전 제어**: Git 버전 관리, 자유로운 백업/마이그레이션
- **AI Agent 자동화 극대화**: 반복 작업 위임, 결과 검토 중심 워크플로우
- **유연한 확장성**: 다양한 AI Agent, 스크립트, CLI 도구와 연동

---

## Requirements

### Epic 1: 마크다운 기반 태스크 관리

---

#### REQ-1.1: 태스크 파일 생성 및 파싱

**User Story:** As a 사용자, I want to 마크다운 파일로 태스크를 정의하고, so that AI Agent가 자동으로 작업을 인식할 수 있다.

##### Acceptance Criteria

1. WHEN 사용자가 YAML frontmatter가 포함된 .md 파일을 생성 THEN 시스템 SHALL frontmatter를 파싱하여 태스크 메타데이터를 추출
2. WHEN frontmatter에 `id`, `title`, `status`, `priority`, `assignee`, `tags` 필드가 존재 THEN 시스템 SHALL 각 필드를 올바른 타입으로 파싱
3. WHEN status 필드가 `TODO | IN_PROGRESS | IN_REVIEW | NEED_FIX | COMPLETE | ON_HOLD` 중 하나 THEN 시스템 SHALL 해당 상태를 유효한 것으로 인식
4. WHEN priority 필드가 `LOW | MEDIUM | HIGH | URGENT` 중 하나 THEN 시스템 SHALL 해당 우선순위를 유효한 것으로 인식
5. WHEN assignee가 "ai-agent"로 지정 THEN 시스템 SHALL 해당 태스크를 AI 작업 대상으로 분류
6. IF frontmatter 파싱에 실패 THEN 시스템 SHALL 에러 로그를 기록하고 해당 파일을 스킵

---

#### REQ-1.2: 칸반보드 UI 렌더링

**User Story:** As a 사용자, I want to 웹 칸반보드에서 태스크들을 시각적으로 확인하고, so that 전체 작업 현황을 한눈에 파악할 수 있다.

##### Acceptance Criteria

1. WHEN 애플리케이션 로드 THEN 시스템 SHALL 지정된 폴더의 모든 .md 파일을 스캔하여 태스크 목록 생성
2. WHEN 태스크 목록이 로드 THEN 시스템 SHALL 6개 컬럼(TODO, IN_PROGRESS, IN_REVIEW, NEED_FIX, COMPLETE, ON_HOLD)으로 태스크 분류
3. WHEN 각 컬럼 렌더링 THEN 시스템 SHALL 상태별 색상 코딩과 아이콘 표시
4. WHEN 태스크 카드 렌더링 THEN 시스템 SHALL 제목, 우선순위 배지, 할당자 정보 표시
5. WHEN 태스크가 100개 이하 THEN 시스템 SHALL 1초 이내에 UI 렌더링 완료

---

#### REQ-1.3: 드래그앤드롭 상태 변경

**User Story:** As a 사용자, I want to 드래그앤드롭으로 태스크를 다른 컬럼으로 이동하고, so that 빠르게 상태를 변경할 수 있다.

##### Acceptance Criteria

1. WHEN 사용자가 태스크 카드를 드래그 시작 THEN 시스템 SHALL 드래그 오버레이 표시
2. WHEN 태스크 카드를 다른 컬럼에 드롭 THEN 시스템 SHALL 해당 태스크의 status 값을 새 컬럼 ID로 변경
3. WHEN status 변경 발생 THEN 시스템 SHALL 해당 .md 파일의 frontmatter status 필드 직접 수정
4. WHEN 같은 컬럼 내에서 드래그앤드롭 THEN 시스템 SHALL 태스크 순서 재정렬
5. WHEN 파일 수정 완료 THEN 시스템 SHALL updated_at 필드를 현재 시간으로 업데이트

---

#### REQ-1.4: 파일 시스템 실시간 동기화

**User Story:** As a 사용자, I want to 파일 변경 시 칸반보드가 자동으로 업데이트되고, so that 별도 새로고침 없이 최신 상태를 확인할 수 있다.

##### Acceptance Criteria

1. WHEN 태스크 폴더에 새 .md 파일 추가 THEN 시스템 SHALL 500ms 이내에 UI에 새 태스크 카드 표시
2. WHEN 태스크 .md 파일 수정 THEN 시스템 SHALL 500ms 이내에 UI에 변경 사항 반영
3. WHEN 태스크 .md 파일 삭제 THEN 시스템 SHALL 500ms 이내에 UI에서 해당 카드 제거
4. WHEN 외부에서 파일 수정(AI Agent, 에디터) THEN 시스템 SHALL 자동으로 변경 감지 및 UI 업데이트
5. IF 파일 시스템 감시 오류 발생 THEN 시스템 SHALL 에러 알림 표시 및 수동 새로고침 버튼 제공

---

#### REQ-1.5: 태스크 상세 보기 및 편집

**User Story:** As a 사용자, I want to 태스크 카드를 클릭하여 상세 내용을 보고 편집할 수 있고, so that 태스크의 세부 요구사항을 확인하고 수정할 수 있다.

##### Acceptance Criteria

1. WHEN 사용자가 태스크 카드 클릭 THEN 시스템 SHALL 사이드바 패널에 태스크 상세 정보 표시
2. WHEN 상세 패널 표시 THEN 시스템 SHALL frontmatter 필드들을 편집 가능한 폼으로 표시
3. WHEN 상세 패널 표시 THEN 시스템 SHALL 마크다운 본문을 편집 가능한 에디터로 표시
4. WHEN 사용자가 필드 수정 후 저장 THEN 시스템 SHALL .md 파일을 직접 업데이트
5. WHEN 파일 저장 실패 THEN 시스템 SHALL 에러 메시지 표시 및 재시도 옵션 제공

---

### Epic 2: AI Agent 연동

---

#### REQ-2.1: AI Agent 태스크 감지

**User Story:** As an AI Agent (Claude Code), I want to 폴더를 스캔하여 내가 처리할 태스크를 찾고, so that 자동으로 작업을 시작할 수 있다.

##### Acceptance Criteria

1. WHEN AI Agent가 태스크 폴더 스캔 THEN 시스템 SHALL `assignee: ai-agent` AND `status: TODO` 조건의 파일 목록 반환
2. WHEN AI Agent가 태스크 작업 시작 THEN 시스템 SHALL status를 `IN_PROGRESS`로 변경
3. WHEN AI Agent가 태스크 작업 완료 THEN 시스템 SHALL status를 `IN_REVIEW`로 변경
4. WHEN AI Agent가 작업 완료 THEN 시스템 SHALL 작업 로그/결과를 `## AI Work Log` 섹션에 추가
5. IF AI Agent 작업 중 오류 발생 THEN 시스템 SHALL 에러 내용을 `## AI Work Log`에 기록

---

#### REQ-2.2: 피드백 반영 재작업

**User Story:** As a 사용자, I want to NEED_FIX 상태의 태스크에 피드백을 작성하면 AI가 재작업하고, so that 수정 사항을 쉽게 반영할 수 있다.

##### Acceptance Criteria

1. WHEN 사용자가 태스크를 `NEED_FIX` 상태로 변경 THEN 시스템 SHALL `## Feedback` 섹션 편집 UI 활성화
2. WHEN `## Feedback` 섹션에 내용이 있고 `assignee: ai-agent` AND `status: NEED_FIX` THEN AI Agent SHALL 해당 태스크 감지
3. WHEN AI Agent가 NEED_FIX 태스크 작업 시작 THEN 시스템 SHALL status를 `IN_PROGRESS`로 변경
4. WHEN AI Agent가 재작업 완료 THEN 시스템 SHALL status를 `IN_REVIEW`로 변경
5. WHEN AI Agent가 재작업 완료 THEN 시스템 SHALL 이전 피드백을 히스토리로 보존

---

#### REQ-2.3: Claude Code 직접 실행 (P1)

**User Story:** As a 사용자, I want to 칸반보드 UI에서 버튼 클릭으로 Claude Code를 실행하고, so that 수동으로 CLI를 열지 않아도 AI 작업을 시작할 수 있다.

##### Acceptance Criteria

1. WHEN 태스크 상세 화면 표시 THEN 시스템 SHALL "AI로 작업 실행" 버튼 표시
2. WHEN 사용자가 버튼 클릭 THEN 시스템 SHALL 해당 태스크 내용을 Claude Code에 전달하여 실행
3. WHEN Claude Code 실행 중 THEN 시스템 SHALL 실행 상태 표시 (Running, Completed, Failed)
4. WHEN Claude Code 완료 THEN 시스템 SHALL 태스크 상태를 `IN_REVIEW`로 자동 변경
5. IF Claude Code CLI가 설치되지 않음 THEN 시스템 SHALL 설치 안내 모달 표시

---

### Epic 3: 태스크 필터링 및 검색

---

#### REQ-3.1: 태스크 필터링 (P1)

**User Story:** As a 사용자, I want to 우선순위, 태그, 할당자로 태스크를 필터링하고, so that 원하는 태스크만 집중해서 볼 수 있다.

##### Acceptance Criteria

1. WHEN 필터 UI 표시 THEN 시스템 SHALL 우선순위 필터 옵션 제공 (LOW, MEDIUM, HIGH, URGENT)
2. WHEN 필터 UI 표시 THEN 시스템 SHALL 태그 필터 옵션 제공 (기존 태그 목록 기반)
3. WHEN 필터 UI 표시 THEN 시스템 SHALL 할당자 필터 옵션 제공 (ai-agent, user 등)
4. WHEN 사용자가 다중 필터 선택 THEN 시스템 SHALL AND 조건으로 필터링 적용
5. WHEN 필터 적용 THEN 시스템 SHALL URL 쿼리 파라미터에 필터 상태 반영

---

### Epic 4: 새 태스크 생성

---

#### REQ-4.1: 새 태스크 생성

**User Story:** As a 사용자, I want to UI에서 새 태스크를 생성하고, so that 마크다운 파일을 수동으로 만들지 않아도 된다.

##### Acceptance Criteria

1. WHEN 사용자가 "새 태스크" 버튼 클릭 THEN 시스템 SHALL 태스크 생성 폼 표시
2. WHEN 폼에 필수 필드(title) 입력 THEN 시스템 SHALL 새 .md 파일 생성
3. WHEN 파일 생성 THEN 시스템 SHALL 고유 id 자동 생성 (task-{timestamp})
4. WHEN 파일 생성 THEN 시스템 SHALL 기본값 적용 (status: TODO, priority: MEDIUM)
5. WHEN 파일 생성 성공 THEN 시스템 SHALL 칸반보드에 즉시 반영

---

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: 각 파일/컴포넌트는 단일 책임 원칙 준수
  - 파일 파싱 로직 분리: `lib/taskParser.ts`
  - 파일 시스템 작업 분리: `lib/fileSystem.ts`
  - UI 컴포넌트 분리: 개별 컴포넌트 파일

- **Modular Design**: 컴포넌트, 유틸리티, 서비스 격리 및 재사용
  - 기존 olly-molly 컴포넌트 활용: `components/ui/`, `components/kanban/`
  - 공통 훅 분리: `hooks/useFileWatcher.ts`, `hooks/useTasks.ts`

- **Dependency Management**: 모듈 간 의존성 최소화
  - gray-matter: frontmatter 파싱
  - chokidar: 파일 시스템 감시
  - @dnd-kit: 드래그앤드롭 (기존 활용)

- **Clear Interfaces**: 컴포넌트와 레이어 간 명확한 인터페이스 정의
  - Task 타입 정의: `types/task.ts`
  - API 응답 타입: `types/api.ts`

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| 폴더 스캔 및 UI 렌더링 | < 1초 | 100개 태스크 기준 |
| 파일 변경 → UI 반영 | < 500ms | chokidar 감지 후 |
| 드래그앤드롭 반응 | < 100ms | 사용자 액션 후 |
| 태스크 저장 | < 200ms | 파일 쓰기 완료 |

### Security

- 파일 시스템 접근은 지정된 폴더 내로 제한
- 경로 순회(path traversal) 공격 방지
- 사용자 입력 sanitization

### Reliability

- 파일 쓰기 실패 시 자동 재시도 (최대 3회)
- 파일 시스템 감시 오류 시 폴백 메커니즘
- 충돌 감지 및 알림 (동시 수정 시)

### Usability

- 복잡한 설정 없이 폴더 지정만으로 시작
- 키보드 단축키 지원 (Post-MVP)
- 다크 모드 지원 (Post-MVP)

### Compatibility

| Platform | Support Level |
|----------|---------------|
| macOS | Full |
| Linux | Full |
| Windows | Full |
| Node.js | 18+ |

### Offline Support

- 100% 오프라인 환경에서 동작
- 외부 API 의존성 없음 (AI Agent 실행 제외)

---

## Traceability Matrix

| Req ID | User Story | Priority | Effort | Epic |
|--------|------------|----------|--------|------|
| REQ-1.1 | 태스크 파일 생성 | P0 | S | Epic 1 |
| REQ-1.2 | 칸반보드 UI 렌더링 | P0 | M | Epic 1 |
| REQ-1.3 | 드래그앤드롭 상태 변경 | P0 | M | Epic 1 |
| REQ-1.4 | 파일 시스템 실시간 동기화 | P0 | M | Epic 1 |
| REQ-1.5 | 태스크 상세 보기/편집 | P0 | M | Epic 1 |
| REQ-2.1 | AI Agent 태스크 감지 | P0 | L | Epic 2 |
| REQ-2.2 | 피드백 반영 재작업 | P0 | M | Epic 2 |
| REQ-2.3 | Claude Code 직접 실행 | P1 | M | Epic 2 |
| REQ-3.1 | 태스크 필터링 | P1 | S | Epic 3 |
| REQ-4.1 | 새 태스크 생성 | P0 | S | Epic 4 |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-11 | Claude | Initial requirements from PRD |
