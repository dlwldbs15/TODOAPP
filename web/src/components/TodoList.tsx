import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Todo } from '../types/todo'
import { TodoItem, TodoItemOverlay } from './TodoItem'
import type { BookmarkedTodosByDate } from '../hooks/useTodos'

interface TodoListProps {
  todos: Todo[]
  currentDate: string
  onToggle: (index: number) => void
  onPin: (index: number) => void
  onBookmark: (index: number) => void
  onDelete: (index: number) => void
  onUpdate: (index: number, text: string) => void
  onReorder: (oldIndex: number, newIndex: number) => void
  bookmarkMode?: boolean
  bookmarkedTodos?: BookmarkedTodosByDate
  onRefreshBookmarks?: () => void
}

// 고정된 항목을 상단에 정렬하는 헬퍼
const sortByPinned = (items: Todo[]): Todo[] => {
  return [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })
}

// 날짜 포맷 헬퍼
const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayName = dayNames[d.getDay()]
  const today = new Date().toISOString().split('T')[0]
  const isToday = dateStr === today
  return `${month}/${day} (${dayName})${isToday ? ' 오늘' : ''}`
}

export function TodoList({ todos, currentDate, onToggle, onPin, onBookmark, onDelete, onUpdate, onReorder, bookmarkMode = false, bookmarkedTodos = {}, onRefreshBookmarks }: TodoListProps) {
  const [activeId, setActiveId] = useState<number | null>(null)

  // 섹션 분리: 오늘 추가 / 이전에서 넘어온 할 일 / 완료 (각각 고정된 항목 상단 정렬)
  const todayIncomplete = sortByPinned(todos.filter(t => !t.completed && t.originalDate === currentDate))
  const carryoverIncomplete = sortByPinned(todos.filter(t => !t.completed && t.originalDate && t.originalDate !== currentDate))
  const completed = sortByPinned(todos.filter(t => t.completed))

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = Number(active.id)
      const newIndex = Number(over.id)
      onReorder(oldIndex, newIndex)
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  // 북마크 모드 렌더링
  if (bookmarkMode) {
    const sortedDates = Object.keys(bookmarkedTodos).sort((a, b) => b.localeCompare(a))
    const totalBookmarked = sortedDates.reduce((sum, date) => sum + bookmarkedTodos[date].length, 0)

    if (totalBookmarked === 0) {
      return (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p>북마크된 할 일이 없습니다</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {sortedDates.map((date) => (
          <section key={date}>
            <h2 className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-3">
              {formatDateLabel(date)} ({bookmarkedTodos[date].length})
            </h2>
            <div className="space-y-3">
              {bookmarkedTodos[date].map((todo, idx) => (
                <BookmarkTodoItem
                  key={`${date}-${idx}`}
                  todo={todo}
                  date={date}
                  onRefresh={onRefreshBookmarks}
                />
              ))}
            </div>
          </section>
        ))}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4">
          총 {totalBookmarked}개의 북마크
        </div>
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>TODO가 없습니다</p>
      </div>
    )
  }

  // Calculate original indices
  const getOriginalIndex = (todo: Todo) => todos.indexOf(todo)

  // Create sortable IDs based on original indices
  const carryoverIds = carryoverIncomplete.map(todo => getOriginalIndex(todo))
  const todayIds = todayIncomplete.map(todo => getOriginalIndex(todo))
  const completedIds = completed.map(todo => getOriginalIndex(todo))

  // Get active todo for overlay
  const activeTodo = activeId !== null ? todos[activeId] : null

  const totalIncomplete = carryoverIncomplete.length + todayIncomplete.length

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        {/* 이전에서 넘어온 할 일 */}
        {carryoverIncomplete.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-3">
              이전에서 넘어온 할 일 ({carryoverIncomplete.length})
            </h2>
            <SortableContext items={carryoverIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {carryoverIncomplete.map((todo) => {
                  const idx = getOriginalIndex(todo)
                  return (
                    <TodoItem
                      key={idx}
                      id={idx}
                      todo={todo}
                      index={idx}
                      isCarryover={true}
                      onToggle={onToggle}
                      onPin={onPin}
                      onBookmark={onBookmark}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </section>
        )}

        {/* 오늘 추가된 할 일 */}
        {todayIncomplete.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              오늘 추가 ({todayIncomplete.length})
            </h2>
            <SortableContext items={todayIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {todayIncomplete.map((todo) => {
                  const idx = getOriginalIndex(todo)
                  return (
                    <TodoItem
                      key={idx}
                      id={idx}
                      todo={todo}
                      index={idx}
                      isCarryover={false}
                      onToggle={onToggle}
                      onPin={onPin}
                      onBookmark={onBookmark}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </section>
        )}

        {/* 완료된 할 일 */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              완료 ({completed.length})
            </h2>
            <SortableContext items={completedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {completed.map((todo) => {
                  const idx = getOriginalIndex(todo)
                  return (
                    <TodoItem
                      key={idx}
                      id={idx}
                      todo={todo}
                      index={idx}
                      isCarryover={false}
                      onToggle={onToggle}
                      onPin={onPin}
                      onBookmark={onBookmark}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </section>
        )}

        <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4">
          총 {todos.length}개 (미완료: {totalIncomplete}, 완료: {completed.length})
        </div>
      </div>

      <DragOverlay>
        {activeTodo ? <TodoItemOverlay todo={activeTodo} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

// 북마크 모드에서 사용하는 TodoItem 컴포넌트
interface BookmarkTodoItemProps {
  todo: Todo
  date: string
  onRefresh?: () => void
}

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined
}

const API_BASE = 'http://localhost:3001/api'

function BookmarkTodoItem({ todo, date, onRefresh }: BookmarkTodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)

  const loadTodosForDate = async (targetDate: string): Promise<Todo[]> => {
    if (isElectron() && window.electronAPI) {
      return await window.electronAPI.loadTodos(targetDate)
    } else {
      const stored = localStorage.getItem(`todos-${targetDate}`)
      if (stored) {
        return JSON.parse(stored)
      }
      try {
        const res = await fetch(`${API_BASE}/todos?date=${targetDate}`)
        if (res.ok) {
          const data = await res.json()
          return data.todos || []
        }
      } catch { /* ignore */ }
      return []
    }
  }

  const saveTodosToDate = async (targetDate: string, todosToSave: Todo[]) => {
    localStorage.setItem(`todos-${targetDate}`, JSON.stringify(todosToSave))
    if (isElectron() && window.electronAPI) {
      await window.electronAPI.saveTodos(targetDate, todosToSave)
    } else {
      try {
        await fetch(`${API_BASE}/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: targetDate, todos: todosToSave }),
        })
      } catch { /* ignore */ }
    }
  }

  const updateTodoInDate = async (updateFn: (t: Todo) => Todo) => {
    const targetDate = todo.originalDate || date
    const todos = await loadTodosForDate(targetDate)
    const updated = todos.map(t =>
      t.text === todo.text && t.originalDate === todo.originalDate ? updateFn(t) : t
    )
    await saveTodosToDate(targetDate, updated)
    onRefresh?.()
  }

  const handleToggle = () => updateTodoInDate(t => ({ ...t, completed: !t.completed }))
  const handlePin = () => updateTodoInDate(t => ({ ...t, pinned: !t.pinned }))
  const handleBookmark = () => updateTodoInDate(t => ({ ...t, bookmarked: !t.bookmarked }))
  const handleDelete = async () => {
    const targetDate = todo.originalDate || date
    const todos = await loadTodosForDate(targetDate)
    const filtered = todos.filter(t =>
      !(t.text === todo.text && t.originalDate === todo.originalDate)
    )
    await saveTodosToDate(targetDate, filtered)
    onRefresh?.()
  }

  const handleEdit = () => {
    setEditText(todo.text)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (editText.trim()) {
      await updateTodoInDate(t => ({ ...t, text: editText.trim() }))
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditText(todo.text)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    else if (e.key === 'Escape') handleCancel()
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-500 shadow-sm">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none"
        />
        <button onClick={handleSave} className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button onClick={handleCancel} className="p-1.5 rounded-lg bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className={`group flex items-center p-4 rounded-2xl border shadow-sm transition-all
      ${todo.completed
        ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
        : 'bg-white dark:bg-slate-800 border-transparent hover:border-indigo-500'
      }`}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
        className="w-5 h-5 rounded-full border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />
      <div className="ml-3 flex-1">
        <span
          onClick={handleToggle}
          className={`cursor-pointer ${
            todo.completed
              ? 'line-through text-slate-400 dark:text-slate-500'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {todo.text}
        </span>
      </div>

      <div className="flex gap-1">
        {/* Pin */}
        <button
          onClick={handlePin}
          className={`p-1.5 rounded-lg transition-colors ${
            todo.pinned ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100'
          }`}
          title={todo.pinned ? '고정 해제' : '상단 고정'}
        >
          <svg className="w-4 h-4" fill={todo.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v4l2 2v4h-5v6l-1 2-1-2v-6H6v-4l2-2V4a1 1 0 011-1h6a1 1 0 011 1z" />
          </svg>
        </button>
        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className={`p-1.5 rounded-lg transition-colors ${
            todo.bookmarked ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100'
          }`}
          title={todo.bookmarked ? '북마크 해제' : '북마크'}
        >
          <svg className="w-4 h-4" fill={todo.bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        {/* Edit */}
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors opacity-0 group-hover:opacity-100"
          title="수정"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        {/* Delete */}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100"
          title="삭제"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
