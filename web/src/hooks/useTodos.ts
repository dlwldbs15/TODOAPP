import { useState, useEffect, useCallback } from 'react'
import type { Todo } from '../types/todo'

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined
}

// API base URL for PWA mode
const API_BASE = 'http://localhost:3001/api'

export function useTodos(date: string) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const loadTodos = useCallback(async () => {
    setLoading(true)
    try {
      if (isElectron() && window.electronAPI) {
        // Electron: use IPC
        const data = await window.electronAPI.loadTodos(date)
        setTodos(data)
      } else {
        // PWA/Web: use API or localStorage fallback
        try {
          const res = await fetch(`${API_BASE}/todos?date=${date}`)
          if (res.ok) {
            const data = await res.json()
            setTodos(data.todos || [])
          } else {
            throw new Error('API not available')
          }
        } catch {
          // Fallback to localStorage
          const stored = localStorage.getItem(`todos-${date}`)
          setTodos(stored ? JSON.parse(stored) : [])
        }
      }
    } catch (error) {
      console.error('Failed to load todos:', error)
      setTodos([])
    } finally {
      setLoading(false)
    }
  }, [date])

  const saveTodos = useCallback(async (newTodos: Todo[]) => {
    try {
      if (isElectron() && window.electronAPI) {
        await window.electronAPI.saveTodos(date, newTodos)
      } else {
        try {
          await fetch(`${API_BASE}/todos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, todos: newTodos }),
          })
        } catch {
          // Fallback to localStorage
          localStorage.setItem(`todos-${date}`, JSON.stringify(newTodos))
        }
      }
      setTodos(newTodos)
    } catch (error) {
      console.error('Failed to save todos:', error)
    }
  }, [date])

  const addTodo = useCallback(async (text: string) => {
    const newTodos = [...todos, { text, completed: false }]
    await saveTodos(newTodos)
  }, [todos, saveTodos])

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

  const refresh = useCallback(() => {
    loadTodos()
  }, [loadTodos])

  useEffect(() => {
    loadTodos()
  }, [loadTodos])

  return { todos, loading, addTodo, toggleTodo, deleteTodo, updateTodo, refresh }
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
