# Date/Time Handling Architecture

이 문서는 TaskFlow의 날짜/시간 처리 로직을 설명합니다.

## 핵심 원칙

**모든 날짜/시간은 로컬 타임으로 저장하고 표시합니다.**

- 타임존 정보 없이 저장 (Z 접미사나 ±HH:MM 없음)
- UTC 변환 없음
- 사용자가 입력한 시간 그대로 유지

## 날짜 형식

### 시간이 있는 경우
```
2026-02-03T15:00:00.000
```
- `T`가 포함됨
- 타임존 접미사 없음

### 시간이 없는 경우 (날짜만)
```
2026-02-03
```
- `T`가 없음
- 시간 미지정을 의미

## 관련 파일 구조

```
frontend/
├── electron/lib/taskParser.ts    # [중요] Electron 메인 프로세스 파서
├── lib/taskParser.ts             # Next.js API 라우트 파서 (참조용)
├── components/
│   ├── ui/DatePicker.tsx         # 날짜/시간 입력 UI
│   ├── calendar/CalendarView.tsx # 캘린더 드래그앤드롭
│   ├── kanban/TaskCard.tsx       # 칸반 카드 날짜 표시
│   └── timeline/
│       ├── TimelineGrid.tsx      # 타임라인 그리드
│       └── TimelineBlock.tsx     # 타임라인 블록
└── hooks/useTaskFilter.ts        # 날짜 필터링
```

## 핵심 함수

### 1. toLocalISOString (taskParser.ts)

Date 객체를 로컬 시간 ISO 문자열로 변환:

```typescript
function toLocalISOString(date: Date): string {
  const y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');      // getUTCHours() 아님!
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${y}-${M}-${d}T${h}:${m}:${s}.${ms}`;           // Z 없음!
}
```

**주의:** `Date.toISOString()`은 UTC로 변환하므로 사용하지 않음.

### 2. Custom YAML Parser (taskParser.ts)

gray-matter 라이브러리가 날짜 문자열을 자동으로 Date 객체로 변환하는 것을 방지:

```typescript
const matterOptions = {
  engines: {
    yaml: {
      parse: (str: string) => {
        // 날짜 문자열을 문자열 그대로 유지
        // Date 객체로 변환하지 않음
      }
    }
  }
};
```

### 3. serializeYamlValue (taskParser.ts)

날짜 문자열을 YAML에 저장할 때 따옴표로 감싸서 파싱 방지:

```typescript
function serializeYamlValue(key: string, value: unknown): string {
  if (typeof value === 'string') {
    // 날짜 형식이면 따옴표로 감싸기
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return `"${value}"`;
    }
  }
  // ...
}
```

### 4. parseOptionalDate (taskParser.ts)

날짜 문자열 파싱 (start_date, due_date용):

```typescript
function parseOptionalDate(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    // UTC 형식(Z 또는 ±HH:MM)이면 로컬로 변환
    if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed);
      return toLocalISOString(date);
    }
    // 그 외는 그대로 반환
    return trimmed;
  }
  return undefined;
}
```

## 시간 유무 판단

시간이 설정되어 있는지 확인하는 방법:

```typescript
// 좋은 방법 - T 포함 여부로 판단
const hasTime = dateStr.includes('T');

// 나쁜 방법 - 12:00을 센티널로 사용 (사용 금지!)
// const hasTime = !dateStr.includes('T12:00:00');
```

## 컴포넌트별 처리

### DatePicker.tsx

```typescript
// 시간 추출
const toTimeFormat = (dateStr?: string) => {
  if (!dateStr || !dateStr.includes('T')) return '';
  return `${dateStr.slice(11, 13)}:${dateStr.slice(14, 16)}`;
};

// ISO 문자열 생성
const buildISOString = (datePart: string, timePart?: string) => {
  if (!datePart) return undefined;
  if (timePart) return `${datePart}T${timePart}:00.000`;
  return datePart;  // 시간 없으면 날짜만
};
```

### CalendarView.tsx (드래그앤드롭)

```typescript
// 기존 시간 보존하면서 날짜만 변경
const currentDate = task.due_date || task.start_date || '';
let timePart = '';
if (currentDate.includes('T')) {
  timePart = currentDate.slice(currentDate.indexOf('T'));
}
const newDateStr = `${newDateString}${timePart}`;
```

### TaskCard.tsx, useTaskFilter.ts

```typescript
// 날짜만 있는 경우 시간 추가
const stripped = dateStr.replace(/["']/g, '');
const dateForParsing = stripped.includes('T')
  ? stripped
  : stripped + 'T00:00:00';
```

## 흔한 실수와 해결방법

### 1. UTC 변환 문제

**문제:** 오후 3시(15:00) 저장 → 오전 6시로 변경

**원인:**
- `Date.toISOString()` 사용 (UTC로 변환됨)
- gray-matter가 자동으로 Date 객체로 변환

**해결:**
- `toLocalISOString()` 사용
- Custom YAML parser로 문자열 유지

### 2. 12:00 센티널 문제

**문제:** 12:00을 "시간 미설정"으로 사용 → 실제 정오 시간 설정 불가

**해결:**
- 날짜만 문자열 (`2026-02-03`)로 시간 미설정 표현
- `T` 포함 여부로 시간 유무 판단

### 3. 잘못된 파서 파일 수정

**문제:** `lib/taskParser.ts` 수정했는데 버그 지속

**원인:** Electron 앱은 `electron/lib/taskParser.ts` 사용

**해결:** 두 파일 모두 동일하게 수정

## 테스트 방법

```bash
# E2E 테스트 실행
node test-electron-parser.js
node test-full-flow.js
```

테스트 결과:
```
=== RESULT ===
✓ SUCCESS: Time 15:00 preserved correctly!
  Input:  2026-02-03T15:00:00.000
  Output: 2026-02-03T15:00:00.000
```

## 변경 시 체크리스트

날짜/시간 관련 코드 수정 시:

- [ ] `electron/lib/taskParser.ts` 수정 (Electron 메인 프로세스)
- [ ] `lib/taskParser.ts` 동일하게 수정 (일관성)
- [ ] `toLocalISOString()` 사용 확인 (`toISOString()` 아님)
- [ ] Custom YAML parser 유지 확인
- [ ] `T` 포함 여부로 시간 판단
- [ ] E2E 테스트 통과 확인
