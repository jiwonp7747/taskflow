# Terminal Feature - Requirements Document

## Overview

**Feature Name**: Integrated Terminal
**Version**: 1.0
**Created**: 2026-01-15
**Status**: Draft

### Summary

TaskFlow Electron 앱에 통합 터미널 기능을 추가하여 사용자가 앱 내에서 직접 명령어를 실행할 수 있도록 합니다. 기존 Kanban/Calendar 뷰와 동일한 메인 콘텐츠 영역을 활용하며, 모드 전환 방식으로 동작합니다.

---

## User Stories

### US-1: 터미널 모드 진입
**As a** 개발자
**I want to** 헤더의 Terminal 버튼을 클릭하여 터미널 모드로 진입
**So that** 앱을 떠나지 않고 명령어를 실행할 수 있다

**Acceptance Criteria**:
- [ ] AC-1.1: New Task 버튼 왼쪽에 Terminal 버튼이 표시된다
- [ ] AC-1.2: Terminal 버튼 클릭 시 메인 콘텐츠가 터미널 UI로 전환된다
- [ ] AC-1.3: 터미널 모드에서 버튼 텍스트가 "Panel"로 변경된다
- [ ] AC-1.4: Panel 버튼 클릭 시 이전 뷰(Kanban/Calendar)로 복귀한다
- [ ] AC-1.5: ViewToggle은 터미널 모드에서 숨겨진다

### US-2: 터미널 탭 관리
**As a** 사용자
**I want to** 여러 개의 터미널 탭을 생성하고 관리
**So that** 다양한 작업을 병렬로 수행할 수 있다

**Acceptance Criteria**:
- [ ] AC-2.1: 터미널 모드 첫 진입 시 Tab 1이 자동 생성된다
- [ ] AC-2.2: [+] 버튼으로 새 탭을 추가할 수 있다
- [ ] AC-2.3: 탭의 [✕] 버튼으로 탭을 닫을 수 있다
- [ ] AC-2.4: 탭 클릭으로 활성 탭을 전환할 수 있다
- [ ] AC-2.5: 마지막 탭을 닫으면 자동으로 Tasks 모드로 복귀한다
- [ ] AC-2.6: ⌘T로 새 탭, ⌘W로 탭 닫기가 동작한다
- [ ] AC-2.7: ⌘1-9로 탭 전환이 동작한다

### US-3: 터미널 명령 실행
**As a** 개발자
**I want to** 터미널에서 쉘 명령어를 실행
**So that** 빌드, 테스트 등의 작업을 수행할 수 있다

**Acceptance Criteria**:
- [ ] AC-3.1: 터미널에 키보드 입력이 가능하다
- [ ] AC-3.2: 명령어 실행 결과가 실시간으로 출력된다
- [ ] AC-3.3: 활성 소스의 경로가 기본 작업 디렉토리로 설정된다
- [ ] AC-3.4: 터미널 출력에 색상(ANSI)이 올바르게 표시된다
- [ ] AC-3.5: 위/아래 화살표로 명령어 히스토리 탐색이 가능하다
- [ ] AC-3.6: Tab 키로 자동완성이 동작한다

### US-4: Split Pane
**As a** 사용자
**I want to** 하나의 탭 내에서 터미널을 분할
**So that** 여러 터미널을 동시에 볼 수 있다

**Acceptance Criteria**:
- [ ] AC-4.1: [Split ▼] 버튼 클릭 시 분할 옵션 메뉴가 표시된다
- [ ] AC-4.2: "Split pane right" (⌘D)로 오른쪽 분할이 된다
- [ ] AC-4.3: "Split pane down" (⇧⌘D)로 아래 분할이 된다
- [ ] AC-4.4: 분할된 pane 사이의 경계를 드래그하여 크기 조절이 가능하다
- [ ] AC-4.5: "Close pane" (⌘W)로 현재 pane을 닫을 수 있다
- [ ] AC-4.6: "Maximize pane" (⇧⌘↵)로 현재 pane을 최대화할 수 있다
- [ ] AC-4.7: 클릭으로 pane 간 포커스 이동이 가능하다

### US-5: 터미널 설정
**As a** 사용자
**I want to** 터미널 설정을 조정
**So that** 내 선호에 맞게 사용할 수 있다

**Acceptance Criteria**:
- [ ] AC-5.1: ⌘+/⌘-로 폰트 크기 조절이 가능하다
- [ ] AC-5.2: ⌘K로 터미널 화면 클리어가 가능하다
- [ ] AC-5.3: ⌘F로 터미널 내 검색이 가능하다 (Phase 5)
- [ ] AC-5.4: 복사/붙여넣기가 올바르게 동작한다

---

## Functional Requirements

### FR-1: Mode Switching
- FR-1.1: 앱은 Tasks 모드와 Terminal 모드 두 가지 상태를 가진다
- FR-1.2: 모드 전환은 헤더의 토글 버튼으로만 가능하다
- FR-1.3: 모드 전환 시 이전 모드의 상태는 유지된다

### FR-2: Terminal Tabs
- FR-2.1: 각 탭은 독립적인 PTY(Pseudo Terminal) 인스턴스를 가진다
- FR-2.2: 탭은 최대 10개까지 생성 가능하다
- FR-2.3: 탭 이름은 "Tab 1", "Tab 2" 형식으로 자동 생성된다

### FR-3: PTY Management
- FR-3.1: PTY는 node-pty를 사용하여 Electron Main Process에서 관리한다
- FR-3.2: 터미널 크기 변경 시 PTY에 resize 이벤트를 전달한다
- FR-3.3: 탭/앱 종료 시 해당 PTY 프로세스를 정리한다

### FR-4: Split Pane Layout
- FR-4.1: 하나의 탭 내에서 최대 4개의 pane으로 분할 가능하다
- FR-4.2: 분할 방향은 수평(right/left)과 수직(up/down)을 지원한다
- FR-4.3: 각 pane은 독립적인 PTY 인스턴스를 가진다

---

## Non-Functional Requirements

### NFR-1: Performance
- NFR-1.1: 터미널 입력 지연은 50ms 이내여야 한다
- NFR-1.2: 대량 출력(10,000줄 이상) 시에도 UI가 멈추지 않아야 한다
- NFR-1.3: 터미널 모드 전환은 100ms 이내에 완료되어야 한다

### NFR-2: Compatibility
- NFR-2.1: macOS 기본 쉘(zsh, bash)을 지원해야 한다
- NFR-2.2: 256색 및 True Color ANSI를 지원해야 한다
- NFR-2.3: 유니코드 문자를 올바르게 표시해야 한다

### NFR-3: Design
- NFR-3.1: TaskFlow 기존 다크 테마와 일관된 디자인을 유지해야 한다
- NFR-3.2: 폰트는 모노스페이스 폰트를 사용해야 한다
- NFR-3.3: 액센트 컬러는 cyan-500/blue-500 그라데이션을 따른다

---

## Constraints

- **C-1**: Electron 환경에서만 동작 (웹 브라우저 미지원)
- **C-2**: node-pty 네이티브 모듈 빌드 필요
- **C-3**: macOS 전용 (현재 빌드 타겟)

---

## Dependencies

### External Dependencies
- `node-pty`: ^1.0.0 - PTY 생성 및 관리
- `xterm`: ^5.3.0 - 터미널 에뮬레이터 UI
- `xterm-addon-fit`: ^0.8.0 - 터미널 자동 리사이즈
- `xterm-addon-web-links`: ^0.9.0 - URL 링크 감지
- `xterm-addon-search`: ^0.13.0 - 터미널 내 검색

### Internal Dependencies
- Electron IPC 시스템 (기존 구현)
- activeSource 상태 (작업 디렉토리 결정)
- TaskFlow 디자인 시스템 (색상, 폰트)

---

## Out of Scope (v1.0)

- 터미널 프로파일 저장/불러오기
- SSH 원격 연결
- 터미널 세션 복원 (앱 재시작 시)
- Windows/Linux 지원
- AI 명령어 추천 (Warp 스타일)

---

## Glossary

| 용어 | 설명 |
|------|------|
| PTY | Pseudo Terminal, 가상 터미널 인터페이스 |
| Pane | 탭 내에서 분할된 개별 터미널 영역 |
| Tab | 하나 이상의 Pane을 포함하는 터미널 세트 |
| Mode | Tasks(Kanban/Calendar) 또는 Terminal 상태 |
