export interface Todo {
  text: string;
  completed: boolean;
  originalDate?: string; // 할 일이 원래 생성된 날짜 (YYYY-MM-DD)
}

export interface TodoFile {
  date: string;
  todos: Todo[];
}

export interface Config {
  vault_path: string;
}
