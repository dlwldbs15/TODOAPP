# 북마크 기능 및 핀 아이콘 변경 설계

## 개요

상단 고정(pin) 기능의 아이콘을 핀 모양으로 변경하고, 북마크 기능을 추가하여 북마크된 TODO만 볼 수 있는 모드를 구현한다.

## 요구사항

1. **핀 아이콘 변경**: 현재 책갈피 모양 → 핀(📌) 모양
2. **북마크 기능 추가**: 나중에 다시 볼 할 일을 마킹
3. **북마크 모드**: 모든 날짜의 북마크된 항목을 날짜별로 그룹핑하여 표시

## 상세 설계

### 1. 데이터 구조 변경

**파일**: `web/src/types/todo.ts`

```typescript
export interface Todo {
  text: string;
  completed: boolean;
  originalDate?: string;
  pinned?: boolean;
  bookmarked?: boolean;  // 새로 추가
}
```

- `bookmarked`는 `completed` 상태와 독립적으로 유지
- 기존 데이터와 호환 (optional 필드)

### 2. 아이콘 변경

**파일**: `web/src/components/TodoItem.tsx`

| 기능 | 현재 | 변경 후 |
|------|------|---------|
| 상단 고정 | 책갈피 모양 | 핀 모양 (파란색) |
| 북마크 | (없음) | 책갈피 모양 (골드색) |

**아이콘 배치 순서** (호버 시 표시):
`[핀] [북마크] [수정] [삭제]`

### 3. 북마크 모드 UI

**파일**: `web/src/components/App.tsx`

**헤더 변경:**
- 현재: `[날짜선택] [다크모드] [설정]`
- 변경: `[날짜선택] [북마크] [다크모드] [설정]`

**동작:**
- 북마크 아이콘 클릭 → 북마크 모드 진입 (아이콘 활성화 표시)
- 다시 클릭 → 일반 모드로 복귀
- 북마크 모드일 때 날짜 선택기는 숨김

**북마크 모드 화면:**
```
[2025-01-15]
  ☐ 북마크된 할 일 A
  ☑ 북마크된 할 일 B (완료됨)

[2025-01-10]
  ☐ 북마크된 할 일 C
```

- 날짜별로 섹션 구분 (최신 날짜가 위)
- 각 항목에서 완료 체크, 수정, 삭제, 북마크 해제 모두 가능

### 4. 북마크 데이터 로딩

**파일**: `web/src/hooks/useTodos.ts`

- 북마크 모드 진입 시 최근 365일 내 모든 날짜 파일 스캔
- `bookmarked: true`인 항목만 필터링
- 날짜별로 그룹핑하여 반환: `{ [date: string]: Todo[] }`
- 수정 시 해당 항목의 `originalDate` 파일에 저장

### 5. 확장성 고려

- 북마크 데이터를 날짜별로 그룹핑된 구조로 관리
- 나중에 날짜별 필터 UI 추가 시 바로 적용 가능

## 수정 파일 목록

1. `web/src/types/todo.ts` - bookmarked 필드 추가
2. `web/src/components/TodoItem.tsx` - 아이콘 변경 및 북마크 버튼 추가
3. `web/src/components/TodoList.tsx` - 북마크 모드 표시 로직
4. `web/src/components/App.tsx` - 헤더에 북마크 모드 토글 추가
5. `web/src/hooks/useTodos.ts` - 북마크 데이터 수집 함수 추가
