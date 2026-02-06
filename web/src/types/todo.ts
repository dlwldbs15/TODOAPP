export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  type: RecurrenceType; // 일, 주, 월
  interval: number; // 반복 간격 (예: 2일마다, 3주마다)
}

export interface Todo {
  text: string;
  completed: boolean;
  originalDate?: string; // 할 일이 원래 생성된 날짜 (YYYY-MM-DD)
  pinned?: boolean; // 상단 고정 여부
  bookmarked?: boolean; // 북마크 여부
  reminder?: string; // 리마인더 시간 (ISO 형식: "2024-02-04T14:30")
  recurrence?: Recurrence; // 주기 반복 설정
}

export interface TodoFile {
  date: string;
  todos: Todo[];
}

export interface Config {
  vault_path: string;
}
