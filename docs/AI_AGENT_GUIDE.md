# AI Agent Guide for TaskFlow

Claude Code 등 AI Agent에서 TaskFlow를 사용하는 방법을 설명합니다.

---

## 개요

TaskFlow는 마크다운 파일 기반의 태스크 관리 시스템입니다. AI Agent는 파일을 직접 수정하거나, 제공된 헬퍼 스크립트를 사용하여 태스크를 처리할 수 있습니다.

### AI Agent 워크플로우

```
1. 사용자가 태스크 생성 (assignee: ai-agent, status: TODO)
2. AI Agent가 태스크 목록 조회
3. AI Agent가 작업 시작 (status → IN_PROGRESS)
4. AI Agent가 작업 수행
5. AI Agent가 작업 완료 (status → IN_REVIEW + 작업 로그 추가)
6. 사용자 검토 후 COMPLETE 또는 NEED_FIX로 변경
7. NEED_FIX인 경우 피드백 반영 후 재작업
```

---

## 방법 1: 헬퍼 스크립트 사용 (권장)

### 설치 확인

```bash
cd /path/to/taskflow/frontend
npm install
```

### 명령어

#### 태스크 목록 조회

AI가 처리할 태스크 목록 조회 (assignee: ai-agent + status: TODO 또는 NEED_FIX):

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

태스크 상태를 IN_PROGRESS로 변경:

```bash
npm run ai:start <task-id>
```

예시:

```bash
npm run ai -- start task-001
```

#### 작업 완료

태스크 상태를 IN_REVIEW로 변경하고 작업 로그 추가:

```bash
npm run ai -- complete <task-id> "작업 내용 설명"
```

예시:

```bash
npm run ai -- complete task-001 "Implemented user authentication with JWT"
```

### 옵션

| 옵션 | 설명 |
|------|------|
| `--json` | JSON 형식으로 출력 |
| `--dir <path>` | 태스크 디렉토리 지정 |

---

## 방법 2: 파일 직접 수정

AI Agent가 마크다운 파일을 직접 읽고 수정할 수도 있습니다.

### 태스크 파일 구조

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

(작업 내용 기록)
```

### 상태 값

| 상태 | 설명 | AI Agent 역할 |
|------|------|---------------|
| `TODO` | 대기 중 | 작업 대상 감지 |
| `IN_PROGRESS` | 진행 중 | 작업 시작 시 변경 |
| `IN_REVIEW` | 검토 대기 | 작업 완료 시 변경 |
| `NEED_FIX` | 수정 필요 | 피드백 확인 후 재작업 |
| `COMPLETE` | 완료 | - |
| `ON_HOLD` | 보류 | - |

### 작업 시작 시

frontmatter의 status를 변경:

```yaml
status: IN_PROGRESS
updated_at: 2025-01-11T10:00:00.000Z
```

### 작업 완료 시

1. frontmatter 수정:

```yaml
status: IN_REVIEW
updated_at: 2025-01-11T11:00:00.000Z
```

2. AI Work Log 섹션에 내용 추가:

```markdown
## AI Work Log

### 2025-01-11
- Implemented JWT authentication
- Added login/logout endpoints
- Created middleware for token validation
```

---

## Claude Code 사용 예시

### 예시 1: 태스크 조회 및 작업

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

### 예시 2: NEED_FIX 태스크 재작업

```
User: 피드백을 확인하고 수정해줘

Claude: 먼저 NEED_FIX 태스크를 확인하겠습니다.

[실행: npm run ai:list]

task-002가 NEED_FIX 상태네요. 피드백을 확인합니다.

[실행: npm run ai -- show task-002]

피드백: "에러 핸들링이 부족합니다. try-catch를 추가해주세요."

알겠습니다. 수정을 시작합니다.

[실행: npm run ai -- start task-002]

(코드 수정)

수정 완료되었습니다.

[실행: npm run ai -- complete task-002 "Added comprehensive error handling with try-catch blocks"]
```

---

## 태스크 폴더 설정

기본적으로 `frontend/tasks/` 폴더를 사용합니다.

다른 폴더를 사용하려면:

1. UI의 왼쪽 사이드바에서 Source 추가
2. 또는 `--dir` 옵션 사용:

```bash
npm run ai -- list --dir /path/to/your/tasks
```

---

## 팁

1. **작업 전 항상 `start` 명령 실행**: 다른 작업자와 충돌 방지
2. **의미 있는 작업 로그 작성**: 검토자가 이해하기 쉽게
3. **NEED_FIX 피드백 꼼꼼히 확인**: `## Feedback` 섹션 참조
4. **파일 직접 수정 시 frontmatter 형식 유지**: YAML 문법 준수

---

## 문제 해결

### 태스크가 목록에 안 보여요

- `assignee`가 `ai-agent`인지 확인
- `status`가 `TODO` 또는 `NEED_FIX`인지 확인
- 태스크 폴더 경로가 올바른지 확인

### 상태 변경이 안 돼요

- 파일 권한 확인
- frontmatter YAML 문법 오류 확인

### 웹 UI에 반영이 안 돼요

- 웹 UI가 실행 중인지 확인 (`npm run dev`)
- 파일 변경이 제대로 저장되었는지 확인
