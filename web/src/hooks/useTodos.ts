import { useState, useEffect, useCallback } from 'react'
import type { Todo } from '../types/todo'

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined
}

// API base URL for PWA mode
const API_BASE = 'http://localhost:3001/api'

// 날짜 관련 유틸리티
const getPreviousDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// 특정 날짜의 할 일만 로드하는 헬퍼 함수
const loadTodosForDate = async (targetDate: string): Promise<Todo[]> => {
  if (isElectron() && window.electronAPI) {
    return await window.electronAPI.loadTodos(targetDate)
  } else {
    try {
      const res = await fetch(`${API_BASE}/todos?date=${targetDate}`)
      if (res.ok) {
        const data = await res.json()
        return data.todos || []
      }
    } catch {
      // Fallback to localStorage
    }
    const stored = localStorage.getItem(`todos-${targetDate}`)
    return stored ? JSON.parse(stored) : []
  }
}

// 이전 날짜들에서 미완료 할 일 수집 (재귀적으로)
const collectCarryoverTodos = async (beforeDate: string, maxDays: number = 365): Promise<Todo[]> => {
  const carryoverTodos: Todo[] = []
  let currentDate = getPreviousDate(beforeDate)
  let daysChecked = 0

  while (daysChecked < maxDays) {
    const todos = await loadTodosForDate(currentDate)
    const incompleteTodos = todos
      .filter(t => !t.completed)
      .map(t => ({
        ...t,
        originalDate: t.originalDate || currentDate // 원래 날짜 보존
      }))

    if (incompleteTodos.length === 0 && todos.length === 0) {
      // 데이터가 없는 날짜면 더 이전으로 (빈 날짜는 건너뜀)
      // 하지만 연속으로 7일간 데이터가 없으면 중단
      let emptyDays = 0
      let checkDate = currentDate
      while (emptyDays < 7) {
        checkDate = getPreviousDate(checkDate)
        const checkTodos = await loadTodosForDate(checkDate)
        if (checkTodos.length > 0) break
        emptyDays++
        daysChecked++
      }
      if (emptyDays >= 7) break
      currentDate = checkDate
      continue
    }

    carryoverTodos.push(...incompleteTodos)
    currentDate = getPreviousDate(currentDate)
    daysChecked++
  }

  return carryoverTodos
}

export function useTodos(date: string) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const loadTodos = useCallback(async () => {
    setLoading(true)
    try {
      // 오늘 날짜의 할 일 로드
      let todayTodos = await loadTodosForDate(date)

      // 오늘 추가된 할 일에 originalDate가 없으면 오늘 날짜로 설정
      todayTodos = todayTodos.map(t => ({
        ...t,
        originalDate: t.originalDate || date
      }))

      // 이전 날짜에서 누적된 미완료 할 일 수집
      const carryoverTodos = await collectCarryoverTodos(date)

      // 중복 제거 (같은 텍스트 + 같은 originalDate)
      const existingKeys = new Set(todayTodos.map(t => `${t.text}|${t.originalDate}`))
      const uniqueCarryover = carryoverTodos.filter(t => !existingKeys.has(`${t.text}|${t.originalDate}`))

      // 누적된 할 일을 앞에, 오늘 할 일을 뒤에 배치
      setTodos([...uniqueCarryover, ...todayTodos])
    } catch (error) {
      console.error('Failed to load todos:', error)
      setTodos([])
    } finally {
      setLoading(false)
    }
  }, [date])

  // 특정 날짜에 할 일 저장하는 헬퍼
  const saveTodosToDate = useCallback(async (targetDate: string, todosToSave: Todo[]) => {
    if (isElectron() && window.electronAPI) {
      await window.electronAPI.saveTodos(targetDate, todosToSave)
    } else {
      try {
        await fetch(`${API_BASE}/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: targetDate, todos: todosToSave }),
        })
      } catch {
        // Fallback to localStorage
        localStorage.setItem(`todos-${targetDate}`, JSON.stringify(todosToSave))
      }
    }
  }, [])

  const saveTodos = useCallback(async (newTodos: Todo[]) => {
    try {
      // 할 일을 originalDate별로 그룹화
      const todosByDate = new Map<string, Todo[]>()

      for (const todo of newTodos) {
        const todoDate = todo.originalDate || date
        if (!todosByDate.has(todoDate)) {
          todosByDate.set(todoDate, [])
        }
        todosByDate.get(todoDate)!.push(todo)
      }

      // 각 날짜별로 저장
      for (const [todoDate, todos] of todosByDate) {
        await saveTodosToDate(todoDate, todos)
      }

      // 삭제된 할 일이 있는 날짜 처리: 원래 해당 날짜에 있던 할 일이 newTodos에 없으면
      // 해당 날짜 파일에서도 제거해야 함
      const currentTodosByDate = new Map<string, Todo[]>()
      for (const todo of todos) {
        const todoDate = todo.originalDate || date
        if (!currentTodosByDate.has(todoDate)) {
          currentTodosByDate.set(todoDate, [])
        }
        currentTodosByDate.get(todoDate)!.push(todo)
      }

      // 기존에 있던 날짜 중 새 목록에 없는 날짜가 있으면 빈 배열로 저장할 필요 없음
      // (해당 날짜의 다른 할 일은 유지해야 함)
      for (const [todoDate] of currentTodosByDate) {
        if (!todosByDate.has(todoDate)) {
          // 이 날짜의 모든 할 일이 삭제됨 - 해당 날짜 파일 업데이트 필요
          const originalTodos = await loadTodosForDate(todoDate)
          const remainingTodos = originalTodos.filter(t =>
            !todos.some(currentTodo =>
              currentTodo.text === t.text && (currentTodo.originalDate || date) === todoDate
            )
          )
          await saveTodosToDate(todoDate, remainingTodos)
        }
      }

      setTodos(newTodos)
    } catch (error) {
      console.error('Failed to save todos:', error)
    }
  }, [date, todos, saveTodosToDate])

  const addTodo = useCallback(async (text: string) => {
    const newTodos = [...todos, { text, completed: false, originalDate: date }]
    await saveTodos(newTodos)
  }, [todos, saveTodos, date])

  const toggleTodo = useCallback(async (index: number) => {
    const newTodos = todos.map((todo, i) =>
      i === index ? { ...todo, completed: !todo.completed } : todo
    )
    await saveTodos(newTodos)
  }, [todos, saveTodos])

  const deleteTodo = useCallback(async (index: number) => {
    const newTodos = todos.filter((_, i) => i !== index)
    await saveTodos(newTodos)
  }, [todos, saveTodos])

  const updateTodo = useCallback(async (index: number, text: string) => {
    const newTodos = todos.map((todo, i) =>
      i === index ? { ...todo, text } : todo
    )
    await saveTodos(newTodos)
  }, [todos, saveTodos])

  const reorderTodos = useCallback(async (oldIndex: number, newIndex: number) => {
    const newTodos = [...todos]
    const [removed] = newTodos.splice(oldIndex, 1)
    newTodos.splice(newIndex, 0, removed)
    await saveTodos(newTodos)
  }, [todos, saveTodos])

  const refresh = useCallback(() => {
    loadTodos()
  }, [loadTodos])

  useEffect(() => {
    loadTodos()
  }, [loadTodos])

  return { todos, loading, addTodo, toggleTodo, deleteTodo, updateTodo, reorderTodos, refresh, currentDate: date }
}

// Type declaration for Electron API
declare global {
  interface Window {
    electronAPI?: {
      loadTodos: (date: string) => Promise<Todo[]>
      saveTodos: (date: string, todos: Todo[]) => Promise<void>
      getConfig: () => Promise<{ vault_path: string } | null>
      setConfig: (vaultPath: string) => Promise<void>
    }
  }
}
