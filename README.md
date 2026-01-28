# TODO App with Obsidian Integration

날짜별 TODO 관리를 위한 Python CLI 애플리케이션입니다. Obsidian vault와 연동되어 마크다운 파일로 TODO를 저장합니다.

## 주요 기능

- 📅 날짜별 TODO 파일 관리 (YYYY-MM-DD.md)
- ✅ TODO 추가, 보기, 완료 표시
- 📁 Obsidian vault 자동 연동
- ☁️ iCloud Drive 지원
- 🗓️ 날짜 선택 (오늘, 어제, 내일, 특정 날짜)
- 📋 전체 TODO 한눈에 보기

## 설치

```bash
# Python 3.7+ 필요
git clone https://github.com/dlwldbs15/TODOAPP.git
cd TODOAPP
```

외부 의존성 없음 - Python 표준 라이브러리만 사용합니다.

## 사용 방법

### Windows

1. `run_todo.bat` 실행
2. 또는 터미널에서:
   ```bash
   python todo_app.py
   ```

### Mac/Linux

```bash
python3 todo_app.py
```

## 첫 실행

1. 앱 실행 시 Obsidian vault 경로 설정
2. 자동으로 `TODO` 폴더 생성
3. 날짜별 마크다운 파일로 TODO 저장

## 파일 구조

```
TodoApp/
├── todo_app.py          # 메인 애플리케이션
├── run_todo.bat         # Windows 실행 파일
├── requirements.txt     # 의존성 (없음)
├── config.json         # Vault 경로 설정 (자동 생성)
└── README.md

{Obsidian Vault}/
└── TODO/
    ├── 2026-01-28.md
    ├── 2026-01-29.md
    └── ...
```

## 마크다운 포맷

```markdown
# TODO - 2026-01-28

_Last updated: 2026-01-28 14:30:00_

## 미완료

- [ ] Python 공부하기
- [ ] 운동하기

## 완료

- [x] 장보기
```

## 향후 계획

- [ ] Windows/Mac GUI 버전
- [ ] 웹 버전
- [ ] 모바일 앱

## 라이선스

MIT License
