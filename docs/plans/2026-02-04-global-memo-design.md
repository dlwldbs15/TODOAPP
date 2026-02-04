# 전체 메모 기능 설계

## 개요

날짜와 무관하게 언제든 빠르게 메모할 수 있는 스크래치패드 기능.
플로팅 버튼으로 열고, 마크다운으로 작성하며, Obsidian vault에 저장된다.

## UI 구성

- **플로팅 버튼**: 화면 우측 하단에 메모 아이콘 버튼
- **메모 패널**: 버튼 클릭 시 열리는 패널/모달
- **에디터**: 라이브 프리뷰 마크다운 에디터
- **저장 버튼**: 패널 하단에 수동 저장 버튼

## 데이터 저장

- **파일 경로**: `{vault}/TODO/memo/global.md`
- **저장 방식**: 수동 저장 (저장 버튼 클릭 시)
- **Electron 환경**: 파일 시스템에 직접 저장
- **웹 환경**: localStorage에 `memo-global` 키로 저장

## 폴더 구조

```
{vault}/TODO/
├── 2024-02-04.json      # 할 일 데이터
├── memo/
│   ├── global.md        # 전체 메모 (이번 구현)
│   └── 2024-02-04.md    # 날짜별 메모 (추후)
```

## 구현 항목

### 새로 만들 파일
- `web/src/components/MemoButton.tsx` - 플로팅 버튼 컴포넌트
- `web/src/components/MemoPanel.tsx` - 메모 패널 (에디터 + 저장 버튼)
- `web/src/hooks/useMemo.ts` - 메모 로드/저장 훅

### 수정할 파일
- `web/src/App.tsx` - MemoButton 추가
- `web/electron/main.ts` - 메모 파일 읽기/쓰기 IPC 핸들러 추가
- `web/electron/preload.ts` - 메모 API 노출

### 라이브러리
- `@uiw/react-md-editor` - 라이브 프리뷰 마크다운 에디터
