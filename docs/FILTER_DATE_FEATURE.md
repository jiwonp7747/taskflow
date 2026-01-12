# TaskFlow 필터 및 날짜 기능

## 개요

Notion 스타일의 태그/날짜/담당자 필터와 Task 날짜 관리 기능을 구현했습니다.
AI와 사용자 간의 일정 공유를 위한 핵심 기능입니다.

## 구현된 기능

### 1. 필터 기능 (FilterBar)

#### 태그 필터
- 태스크에 설정된 태그 기반 필터링
- 다중 선택 지원 (여러 태그 동시 필터)
- 선택된 태그를 가진 태스크만 표시

#### 담당자 필터
- **All**: 모든 태스크 표시
- **User**: 사용자 담당 태스크만 표시
- **AI Agent**: AI 담당 태스크만 표시

#### 날짜 필터 (Due Date 기준)
프리셋 옵션:
- **All**: 모든 태스크
- **Today**: 오늘 마감인 태스크
- **This Week**: 이번 주 내 마감인 태스크
- **This Month**: 이번 달 내 마감인 태스크
- **Overdue**: 마감일이 지난 태스크
- **Custom**: 사용자 지정 날짜 범위

### 2. 날짜 관리 기능

#### Task 날짜 필드
- `start_date`: 시작 예정일 (선택사항)
- `due_date`: 마감일 (선택사항)
- ISO 8601 형식으로 마크다운 frontmatter에 저장

#### DatePicker 컴포넌트
- 네이티브 HTML5 date input 사용 (외부 라이브러리 불필요)
- 사이버펑크 테마 스타일링
- Clear 버튼으로 날짜 초기화 가능
- min/max 날짜 제한 지원

### 3. 마감일 표시 (TaskCard)

색상 코딩된 마감일 인디케이터:

| 상태 | 색상 | 표시 예시 |
|------|------|----------|
| 지연됨 | 빨강 (red-400) | "3d overdue" |
| 오늘 마감 | 주황 (amber-400) | "Due today" |
| 내일 마감 | 주황 (amber-400) | "Tomorrow" |
| 2-7일 남음 | 청록 (cyan-400) | "5d left" |
| 7일 이상 | 회색 (slate-400) | "Jan 15" |

## 파일 구조

### 새로 생성된 파일

```
frontend/
├── components/
│   ├── ui/
│   │   └── DatePicker.tsx      # 재사용 가능한 날짜 선택 컴포넌트
│   └── kanban/
│       └── FilterBar.tsx       # 필터 UI 컴포넌트
└── hooks/
    └── useTaskFilter.ts        # 필터 로직 훅
```

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `types/task.ts` | `DatePreset`, `TaskFilter` 타입 추가, Task에 날짜 필드 추가 |
| `lib/taskParser.ts` | 날짜 필드 파싱/생성 로직 추가 |
| `components/kanban/TaskCard.tsx` | 마감일 표시 UI 추가 |
| `components/kanban/TaskSidebar.tsx` | DatePicker 2개 추가 (시작일, 마감일) |
| `components/kanban/CreateTaskModal.tsx` | DatePicker 2개 추가 |
| `app/page.tsx` | FilterBar 및 useTaskFilter 통합 |

## 사용 방법

### 필터 사용
1. 칸반보드 상단의 "Filters" 버튼 클릭
2. 원하는 필터 옵션 선택
   - 태그 버튼 클릭으로 태그 필터 토글
   - 담당자 버튼으로 담당자 필터 설정
   - 날짜 프리셋 버튼으로 날짜 필터 설정
3. "Clear all" 버튼으로 모든 필터 초기화

### 날짜 설정
1. 태스크 카드 클릭하여 사이드바 열기
2. "Start Date" 또는 "Due Date" 필드 클릭
3. 날짜 선택 후 "Save Changes" 클릭

### 새 태스크 생성 시 날짜 입력
1. "New Task" 버튼 클릭
2. 기본 정보 입력
3. "Start Date", "Due Date" 필드에 날짜 선택
4. "Create Task" 클릭

## 기술 상세

### TaskFilter 인터페이스

```typescript
export type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'overdue' | 'custom';

export interface TaskFilter {
  tags?: string[];
  assignee?: TaskAssignee | 'all';
  dateRange?: {
    type: DatePreset;
    startDate?: string;
    endDate?: string;
  };
}
```

### useTaskFilter 훅 반환값

```typescript
{
  filter: TaskFilter;              // 현재 필터 상태
  filteredTasks: Task[];           // 필터링된 태스크 목록
  setTagFilter: (tags) => void;    // 태그 필터 설정
  setAssigneeFilter: (assignee) => void;  // 담당자 필터 설정
  setDatePreset: (preset) => void; // 날짜 프리셋 설정
  setCustomDateRange: (start, end) => void;  // 커스텀 날짜 범위 설정
  clearFilters: () => void;        // 모든 필터 초기화
  availableTags: string[];         // 사용 가능한 태그 목록
  isFiltered: boolean;             // 필터 활성화 여부
}
```

### 마크다운 파일 형식

```markdown
---
title: Task Title
status: TODO
priority: HIGH
assignee: ai-agent
tags:
  - backend
  - api
start_date: 2026-01-10T12:00:00.000Z
due_date: 2026-01-15T12:00:00.000Z
created_at: 2026-01-10T10:00:00.000Z
updated_at: 2026-01-10T10:00:00.000Z
---

## Description
태스크 설명...
```

## 향후 개선 사항

- [ ] 캘린더 뷰 추가
- [ ] 반복 태스크 지원
- [ ] 알림/리마인더 기능
- [ ] 태스크 간 의존성 관리
- [ ] 시간 단위 일정 관리
