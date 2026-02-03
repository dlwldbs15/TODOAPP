# TODO App

날짜별 TODO 관리를 위한 웹 애플리케이션입니다. PWA 및 Electron 데스크톱 앱을 지원합니다.

## 주요 기능

- 날짜별 TODO 파일 관리
- 할 일 추가, 완료, 수정, 삭제
- 드래그 앤 드롭으로 순서 변경
- 상단 고정 (핀) 기능
- 북마크 기능 - 나중에 다시 볼 할 일 마킹
- 북마크 모드 - 모든 날짜의 북마크를 한눈에
- 이전 날짜 미완료 할 일 자동 누적
- 다크 모드 지원
- PWA 오프라인 지원
- Electron 데스크톱 앱 지원

## 설치

```bash
cd web
npm install
```

## 실행

### 개발 서버

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
npm run preview
```

### Electron 데스크톱 앱

```bash
npm run electron:dev   # 개발 모드
npm run electron:build # 빌드
```

## 기술 스택

- React 19 + TypeScript
- Vite
- Tailwind CSS
- @dnd-kit (드래그 앤 드롭)
- PWA (vite-plugin-pwa)
- Electron

## 프로젝트 구조

```
web/
├── src/
│   ├── components/
│   │   ├── AddTodo.tsx      # 할 일 추가 폼
│   │   ├── DatePicker.tsx   # 날짜 선택
│   │   ├── Settings.tsx     # 설정 모달
│   │   ├── TodoItem.tsx     # 개별 할 일 아이템
│   │   └── TodoList.tsx     # 할 일 목록
│   ├── hooks/
│   │   └── useTodos.ts      # 할 일 데이터 관리
│   ├── types/
│   │   └── todo.ts          # 타입 정의
│   ├── App.tsx              # 메인 앱
│   └── main.tsx             # 엔트리포인트
├── electron/
│   ├── main.ts              # Electron 메인 프로세스
│   └── preload.ts           # Electron 프리로드
└── package.json
```

## 데이터 저장

- **PWA 모드**: localStorage + Express API 서버
- **Electron 모드**: 로컬 파일 시스템 (Obsidian 연동 가능)

## 라이선스

MIT License
