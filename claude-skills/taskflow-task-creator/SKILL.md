---
name: taskflow-task-creator
description: "TaskFlow 마크다운 작업 파일 생성 스킬. 사용자가 해야 할 일을 말하면 작업 단위로 분해하여 TaskFlow 형식의 .md 파일로 생성. Use when user says '작업 생성', '태스크 만들어', '할 일 추가', 'task 생성', '일정 추가', '스케줄 추가', mentions tasks to create, or wants to break down work into TaskFlow format. Supports local directory and GitHub remote sources."
---

# TaskFlow Task Creator

사용자가 할 일을 말하면 TaskFlow 형식의 마크다운 작업 파일로 변환하여 생성.

## Task File Format

```markdown
---
id: YYYY-MM-DD-제목-slug
title: 작업 제목
status: TODO
priority: HIGH | MEDIUM | LOW | URGENT
assignee: user
created_at: "YYYY-MM-DDTHH:MM:SS.mmm"
updated_at: "YYYY-MM-DDTHH:MM:SS.mmm"
start_date: "YYYY-MM-DDTHH:MM:SS.mmm"
due_date: "YYYY-MM-DDTHH:MM:SS.mmm"
tags: [tag1, tag2]
task_size: S | M | L | XL
total_hours: 8
---

상세 내용 (마크다운)
```

## Field Rules

| Field | Required | Rule |
|-------|----------|------|
| `id` | Yes | `YYYY-MM-DD-제목-slug` (날짜-제목 기반) |
| `title` | Yes | 간결한 작업 제목 |
| `status` | Yes | 항상 `TODO` (새 작업) |
| `priority` | Yes | `LOW`, `MEDIUM`, `HIGH`, `URGENT` (기본: `MEDIUM`) |
| `assignee` | Yes | 항상 `user` (기본값) |
| `created_at` | Yes | 로컬 ISO8601 (따옴표 필수, Z 없음): `"2026-02-05T09:00:00.000"` |
| `updated_at` | Yes | created_at과 동일 |
| `start_date` | No | 시작일 (선택, 따옴표 필수) |
| `due_date` | No | 마감일 (선택, 따옴표 필수) |
| `tags` | Yes | 인라인 배열: `[회사, 개발]` |
| `task_size` | No | 작업 크기: `S`, `M`, `L`, `XL` |
| `total_hours` | No | 예상 소요 시간 (숫자) |

**중요: 날짜 형식**
- Z 접미사 없음 (UTC가 아닌 로컬 시간)
- 따옴표로 감싸기 필수: `created_at: "2026-02-05T09:00:00.000"`
- 밀리초 포함: `.000`

## Workflow

### 1. Source 결정

사용자가 source를 명시하면 해당 source 사용. 명시하지 않으면 기본값 사용.

**Source 명시 패턴:**
- "로컬에 저장해줘" / "~/tasks에 저장" → 로컬 소스
- "깃헙에 올려줘" / "github에 저장" → GitHub 소스
- 명시 없음 → 로컬 (기본값: `~/tasks`)

### 2. 작업 분해

사용자 입력을 분석하여 독립적인 작업 단위로 분해:
- 하나의 명확한 결과물
- 독립적으로 완료 가능
- 적절한 크기 (너무 크거나 작지 않게)

### 3. 파일 생성

각 작업에 대해 마크다운 파일 생성.

## Source Types

### Local Source (Default)

로컬 디렉터리에 직접 파일 생성. Write tool 사용.

**기본 경로:** `~/tasks`

**사용자 지정 경로:**
```
"~/my-tasks에 작업 추가해줘: API 개발"
→ ~/my-tasks/2026-02-05-api-development.md 생성
```

**로컬 폴더 구조:** `{지정경로}/YYYY-MM-DD-title.md`

### GitHub Source

GitHub API를 통해 파일 생성. 사용자의 GitHub 저장소 설정 필요.

```bash
# 파일 생성 (gh CLI 사용)
YEAR_MONTH=$(date +%Y-%m)
gh api repos/{OWNER}/{REPO}/contents/schedule/${YEAR_MONTH}/${FILENAME} \
  -X PUT \
  -f message="Add task: ${TITLE}" \
  -f content="$(echo -n "${CONTENT}" | base64)"
```

**GitHub 폴더 구조:** `schedule/YYYY-MM/YYYY-MM-DD-title.md`

## Examples

### Input
"이번 주에 SI Portal DB 설치 프로그램 작성하고, 다음 주까지 API 문서 정리해야 해"

### Output

**File 1:** `2026-02-05-si-portal-db-installer.md`
```markdown
---
id: 2026-02-05-si-portal-db-installer
title: SI Portal DB 설치 프로그램 작성
status: TODO
priority: HIGH
assignee: user
created_at: "2026-02-05T09:00:00.000"
updated_at: "2026-02-05T09:00:00.000"
start_date: "2026-02-05T09:00:00.000"
due_date: "2026-02-07T18:00:00.000"
tags: [회사, 개발, SI Portal]
task_size: M
---

SI Portal DB 설치 프로그램 작성
- DB 설치 자동화 스크립트 개발
- 설치 가이드 문서 포함
```

**File 2:** `2026-02-12-api-documentation.md`
```markdown
---
id: 2026-02-12-api-documentation
title: API 문서 정리
status: TODO
priority: MEDIUM
assignee: user
created_at: "2026-02-05T09:00:00.000"
updated_at: "2026-02-05T09:00:00.000"
start_date: "2026-02-10T09:00:00.000"
due_date: "2026-02-14T18:00:00.000"
tags: [회사, 문서]
task_size: S
---

API 문서 정리
- 기존 API 엔드포인트 문서화
- 사용 예시 추가
```

## Quick Commands

### Local (Default)
```bash
# Write tool로 직접 생성
# file_path: ~/tasks/YYYY-MM-DD-slug.md
```

### GitHub
```bash
# 파일 생성 (gh CLI 사용)
YEAR_MONTH=$(date +%Y-%m)
gh api repos/{OWNER}/{REPO}/contents/schedule/${YEAR_MONTH}/${FILENAME} \
  -X PUT -f message="Add task: ${TITLE}" -f content="$(echo -n "${CONTENT}" | base64)"
```

## Usage Examples

**Local (기본):**
```
"작업 생성: API 문서 정리하고 테스트 코드 작성"
→ ~/tasks/ 폴더에 2개 파일 생성
```

**Local (경로 지정):**
```
"~/projects/tasks에 작업 추가: 서버 배포 준비"
→ ~/projects/tasks/2026-02-05-server-deployment.md 생성
```

**GitHub:**
```
"깃헙에 작업 추가: 코드 리뷰 완료"
→ GitHub schedule/2026-02/ 폴더에 파일 생성
```

## Valid Values Reference

### Status (새 작업은 항상 TODO)
- `TODO` - 할 일
- `IN_PROGRESS` - 진행 중
- `IN_REVIEW` - 검토 중
- `NEED_FIX` - 수정 필요
- `COMPLETE` - 완료
- `ON_HOLD` - 보류

### Priority
- `LOW` - 낮음
- `MEDIUM` - 보통 (기본값)
- `HIGH` - 높음
- `URGENT` - 긴급

### Task Size (선택)
- `S` - 소규모 (1-2시간)
- `M` - 중규모 (반나절)
- `L` - 대규모 (하루)
- `XL` - 초대규모 (며칠)

## Configuration

### GitHub 저장소 설정 (선택사항)

GitHub를 기본 저장소로 사용하려면 CLAUDE.md에 다음을 추가:

```markdown
## TaskFlow Settings
- GitHub Repo: {OWNER}/{REPO}
- Schedule Path: schedule
```
