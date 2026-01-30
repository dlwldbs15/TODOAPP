export interface Todo {
  text: string;
  completed: boolean;
}

export interface TodoFile {
  date: string;
  todos: Todo[];
}

export interface Config {
  vault_path: string;
}
