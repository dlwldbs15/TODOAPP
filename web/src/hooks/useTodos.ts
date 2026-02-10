import { useState, useEffect, useCallback } from "react";
import type { Todo, Recurrence } from "../types/todo";
import { isElectron, isCapacitor } from "../utils/platform";
import * as capStorage from "../services/capacitorStorage";

// API base URL for PWA mode
const API_BASE = "http://localhost:3001/api";

// 로컬 시간대 기준 날짜 문자열 반환 (YYYY-MM-DD)
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 날짜 관련 유틸리티
const getPreviousDate = (dateStr: string): string => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
};

// 특정 날짜의 할 일만 로드하는 헬퍼 함수
const loadTodosForDate = async (targetDate: string): Promise<Todo[]> => {
  if (isElectron() && window.electronAPI) {
    return await window.electronAPI.loadTodos(targetDate);
  }

  if (isCapacitor()) {
    return await capStorage.loadTodos(targetDate);
  }

  // Web/PWA: localStorage를 항상 우선 사용 (안정성 보장)
  const stored = localStorage.getItem(`todos-${targetDate}`);
  if (stored) {
    return JSON.parse(stored);
  }

  // localStorage에 없으면 API 시도
  try {
    const res = await fetch(`${API_BASE}/todos?date=${targetDate}`);
    if (res.ok) {
      const data = await res.json();
      const todos = data.todos || [];
      // API에서 가져온 데이터를 localStorage에도 저장
      if (todos.length > 0) {
        localStorage.setItem(`todos-${targetDate}`, JSON.stringify(todos));
      }
      return todos;
    }
  } catch {
    // API 실패
  }
  return [];
};

// 북마크된 할 일을 날짜별로 그룹핑하여 반환
export type BookmarkedTodosByDate = { [date: string]: Todo[] };

export const collectBookmarkedTodos = async (
  maxDays: number = 365,
): Promise<BookmarkedTodosByDate> => {
  const result: BookmarkedTodosByDate = {};
  const today = getLocalDateString();
  let currentDate = today;
  let daysChecked = 0;
  let consecutiveEmptyDays = 0;

  while (daysChecked < maxDays && consecutiveEmptyDays < 30) {
    const todos = await loadTodosForDate(currentDate);
    const bookmarkedTodos = todos.filter((t) => t.bookmarked);

    if (bookmarkedTodos.length > 0) {
      result[currentDate] = bookmarkedTodos.map((t) => ({
        ...t,
        originalDate: t.originalDate || currentDate,
      }));
      consecutiveEmptyDays = 0;
    } else if (todos.length === 0) {
      consecutiveEmptyDays++;
    } else {
      consecutiveEmptyDays = 0;
    }

    currentDate = getPreviousDate(currentDate);
    daysChecked++;
  }

  return result;
};

// 이전 날짜들에서 미완료 할 일 수집 (재귀적으로)
const collectCarryoverTodos = async (
  beforeDate: string,
  maxDays: number = 365,
): Promise<Todo[]> => {
  const carryoverTodos: Todo[] = [];
  let currentDate = getPreviousDate(beforeDate);
  let daysChecked = 0;

  while (daysChecked < maxDays) {
    const todos = await loadTodosForDate(currentDate);
    const incompleteTodos = todos
      .filter((t) => !t.completed)
      .map((t) => ({
        ...t,
        originalDate: t.originalDate || currentDate, // 원래 날짜 보존
      }));

    if (incompleteTodos.length === 0 && todos.length === 0) {
      // 데이터가 없는 날짜면 더 이전으로 (빈 날짜는 건너뜀)
      // 하지만 연속으로 7일간 데이터가 없으면 중단
      let emptyDays = 0;
      let checkDate = currentDate;
      while (emptyDays < 7) {
        checkDate = getPreviousDate(checkDate);
        const checkTodos = await loadTodosForDate(checkDate);
        if (checkTodos.length > 0) break;
        emptyDays++;
        daysChecked++;
      }
      if (emptyDays >= 7) break;
      currentDate = checkDate;
      continue;
    }

    carryoverTodos.push(...incompleteTodos);
    currentDate = getPreviousDate(currentDate);
    daysChecked++;
  }

  return carryoverTodos;
};

export function useTodos(date: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      // 오늘 날짜의 할 일 로드
      let todayTodos = await loadTodosForDate(date);

      // 오늘 추가된 할 일에 originalDate가 없으면 오늘 날짜로 설정
      todayTodos = todayTodos.map((t) => ({
        ...t,
        originalDate: t.originalDate || date,
      }));

      // 이전 날짜에서 누적된 미완료 할 일 수집
      const carryoverTodos = await collectCarryoverTodos(date);

      // 중복 제거 (같은 텍스트 + 같은 originalDate)
      const existingKeys = new Set(
        todayTodos.map((t) => `${t.text}|${t.originalDate}`),
      );
      const uniqueCarryover = carryoverTodos.filter(
        (t) => !existingKeys.has(`${t.text}|${t.originalDate}`),
      );

      // 누적된 할 일을 앞에, 오늘 할 일을 뒤에 배치
      setTodos([...uniqueCarryover, ...todayTodos]);
    } catch (error) {
      console.error("Failed to load todos:", error);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  // 특정 날짜에 할 일 저장하는 헬퍼
  const saveTodosToDate = useCallback(
    async (targetDate: string, todosToSave: Todo[]) => {
      if (isElectron() && window.electronAPI) {
        await window.electronAPI.saveTodos(targetDate, todosToSave);
        return;
      }

      if (isCapacitor()) {
        await capStorage.saveTodos(targetDate, todosToSave);
        return;
      }

      // Web/PWA: localStorage에 먼저 저장 (안정성 보장)
      localStorage.setItem(`todos-${targetDate}`, JSON.stringify(todosToSave));
      try {
        const res = await fetch(`${API_BASE}/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: targetDate, todos: todosToSave }),
        });
        if (!res.ok) {
          console.warn("API save failed, using localStorage");
        }
      } catch {
        // API 실패해도 이미 localStorage에 저장했으므로 괜찮음
      }
    },
    [],
  );

  const saveTodos = useCallback(
    async (newTodos: Todo[]) => {
      try {
        // 할 일을 originalDate별로 그룹화
        const todosByDate = new Map<string, Todo[]>();

        for (const todo of newTodos) {
          const todoDate = todo.originalDate || date;
          if (!todosByDate.has(todoDate)) {
            todosByDate.set(todoDate, []);
          }
          todosByDate.get(todoDate)!.push(todo);
        }

        // 이전 상태의 날짜들도 추적 (삭제 처리용)
        const prevTodosByDate = new Map<string, Todo[]>();
        for (const todo of todos) {
          const todoDate = todo.originalDate || date;
          if (!prevTodosByDate.has(todoDate)) {
            prevTodosByDate.set(todoDate, []);
          }
          prevTodosByDate.get(todoDate)!.push(todo);
        }

        // 모든 관련 날짜 수집
        const allDates = new Set([
          ...todosByDate.keys(),
          ...prevTodosByDate.keys(),
        ]);

        // 각 날짜별로 처리
        for (const todoDate of allDates) {
          const newTodosForDate = todosByDate.get(todoDate) || [];

          // 해당 날짜의 기존 저장된 할 일 로드
          const storedTodos = await loadTodosForDate(todoDate);

          // 기존 저장된 할 일 중 현재 뷰에 없는 것들 (다른 날짜에서 관리되는 것들) 유지
          const todosToKeep = storedTodos.filter((stored) => {
            // 이전 뷰에도 없고 새 뷰에도 없는 것 = 유지
            const wasInPrevView = todos.some(
              (t) =>
                t.text === stored.text && (t.originalDate || date) === todoDate,
            );
            return !wasInPrevView;
          });

          // 새 할 일 + 유지할 할 일
          const finalTodos = [...newTodosForDate, ...todosToKeep];
          await saveTodosToDate(todoDate, finalTodos);
        }

        setTodos(newTodos);
      } catch (error) {
        console.error("Failed to save todos:", error);
      }
    },
    [date, todos, saveTodosToDate],
  );

  const addTodo = useCallback(
    async (text: string, reminder?: string, recurrence?: Recurrence) => {
      const newTodos = [
        ...todos,
        { text, completed: false, originalDate: date, reminder, recurrence },
      ];
      await saveTodos(newTodos);
    },
    [todos, saveTodos, date],
  );

  const toggleTodo = useCallback(
    async (index: number) => {
      const todo = todos[index];
      const willComplete = !todo.completed;

      const newTodos = todos.map((t, i) =>
        i === index ? { ...t, completed: willComplete } : t,
      );
      await saveTodos(newTodos);

      // 반복 설정된 TODO를 완료하면 다음 주기 날짜에 새 TODO 자동 생성
      if (willComplete && todo.recurrence) {
        const baseDate = new Date((todo.originalDate || date) + "T00:00:00");
        const { type, interval } = todo.recurrence;

        if (type === "daily") {
          baseDate.setDate(baseDate.getDate() + interval);
        } else if (type === "weekly") {
          baseDate.setDate(baseDate.getDate() + interval * 7);
        } else if (type === "monthly") {
          baseDate.setMonth(baseDate.getMonth() + interval);
        }

        const nextDate = getLocalDateString(baseDate);
        const existingTodos = await loadTodosForDate(nextDate);

        // 동일 텍스트+반복 설정의 TODO가 이미 있으면 중복 생성하지 않음
        const alreadyExists = existingTodos.some(
          (t) => t.text === todo.text && t.recurrence?.type === todo.recurrence?.type && t.recurrence?.interval === todo.recurrence?.interval,
        );

        if (!alreadyExists) {
          const nextTodo: Todo = {
            text: todo.text,
            completed: false,
            originalDate: nextDate,
            recurrence: todo.recurrence,
          };
          await saveTodosToDate(nextDate, [...existingTodos, nextTodo]);
        }
      }
    },
    [todos, saveTodos, date, saveTodosToDate],
  );

  const togglePin = useCallback(
    async (index: number) => {
      const newTodos = todos.map((todo, i) =>
        i === index ? { ...todo, pinned: !todo.pinned } : todo,
      );
      await saveTodos(newTodos);
    },
    [todos, saveTodos],
  );

  const toggleBookmark = useCallback(
    async (index: number) => {
      const newTodos = todos.map((todo, i) =>
        i === index ? { ...todo, bookmarked: !todo.bookmarked } : todo,
      );
      await saveTodos(newTodos);
    },
    [todos, saveTodos],
  );

  const deleteTodo = useCallback(
    async (index: number) => {
      const newTodos = todos.filter((_, i) => i !== index);
      await saveTodos(newTodos);
    },
    [todos, saveTodos],
  );

  const updateTodo = useCallback(
    async (index: number, text: string, reminder?: string, recurrence?: Recurrence) => {
      const newTodos = todos.map((todo, i) =>
        i === index ? { ...todo, text, reminder, recurrence } : todo,
      );
      await saveTodos(newTodos);
    },
    [todos, saveTodos],
  );

  const clearReminder = useCallback(
    async (index: number) => {
      const newTodos = todos.map((todo, i) =>
        i === index ? { ...todo, reminder: undefined } : todo,
      );
      await saveTodos(newTodos);
    },
    [todos, saveTodos],
  );

  const reorderTodos = useCallback(
    async (oldIndex: number, newIndex: number) => {
      const newTodos = [...todos];
      const [removed] = newTodos.splice(oldIndex, 1);
      newTodos.splice(newIndex, 0, removed);
      await saveTodos(newTodos);
    },
    [todos, saveTodos],
  );

  const refresh = useCallback(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  return {
    todos,
    loading,
    addTodo,
    toggleTodo,
    togglePin,
    toggleBookmark,
    deleteTodo,
    updateTodo,
    reorderTodos,
    refresh,
    clearReminder,
    currentDate: date,
  };
}

// Type declaration for Electron API
declare global {
  interface Window {
    electronAPI?: {
      loadTodos: (date: string) => Promise<Todo[]>;
      saveTodos: (date: string, todos: Todo[]) => Promise<void>;
      getConfig: () => Promise<{
        vault_path: string;
        autoLaunch?: boolean;
      } | null>;
      setConfig: (vaultPath: string) => Promise<void>;
      getAutoLaunch: () => Promise<boolean>;
      setAutoLaunch: (enabled: boolean) => Promise<void>;
      showNotification: (title: string, body: string) => void;
      loadMemo: (name: string) => Promise<string>;
      saveMemo: (name: string, content: string) => Promise<void>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      windowIsMaximized: () => Promise<boolean>;
    };
  }
}
