import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Todo } from '../types/todo'

interface TodoItemProps {
  id: number
  todo: Todo
  index: number
  isCarryover?: boolean
  onToggle: (index: number) => void
  onPin: (index: number) => void
  onBookmark: (index: number) => void
  onDelete: (index: number) => void
  onUpdate: (index: number, text: string, reminder?: string) => void
}

// 날짜 포맷 헬퍼
const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 리마인더 시간 포맷 헬퍼
const formatReminderLabel = (reminderStr: string): string => {
  const d = new Date(reminderStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours()
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

export function TodoItem({ id, todo, index, isCarryover = false, onToggle, onPin, onBookmark, onDelete, onUpdate }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)
  const [editReminder, setEditReminder] = useState(todo.reminder || '')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleEdit = () => {
    setEditText(todo.text)
    setEditReminder(todo.reminder || '')
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(index, editText.trim(), editReminder || undefined)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditText(todo.text)
    setEditReminder(todo.reminder || '')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-500 shadow-sm">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700
              text-slate-900 dark:text-slate-100 outline-none"
          />
          <button
            onClick={handleSave}
            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* 리마인더 설정 */}
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <input
            type="datetime-local"
            value={editReminder}
            onChange={(e) => setEditReminder(e.target.value)}
            className="flex-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700
              text-slate-900 dark:text-slate-100 outline-none text-sm"
          />
          {editReminder && (
            <button
              onClick={() => setEditReminder('')}
              className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
              title="리마인더 삭제"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center p-4 rounded-2xl border shadow-sm transition-all
        ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}
        ${todo.completed
          ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
          : isCarryover
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 hover:border-amber-400'
            : 'bg-white dark:bg-slate-800 border-transparent hover:border-indigo-500'
        }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 mr-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none"
        title="드래그하여 정렬"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>

      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(index)}
        className="w-5 h-5 rounded-full border-slate-300 dark:border-slate-600
          text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />
      <div className="ml-3 flex-1">
        <span
          onClick={() => onToggle(index)}
          className={`cursor-pointer ${
            todo.completed
              ? 'line-through text-slate-400 dark:text-slate-500'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {todo.text}
        </span>
        {isCarryover && todo.originalDate && (
          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
            {formatDateLabel(todo.originalDate)}에서 넘어옴
          </span>
        )}
        {todo.reminder && (
          <span className="ml-2 text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {formatReminderLabel(todo.reminder)}
          </span>
        )}
      </div>

      {/* Action buttons - pin/bookmark always visible if active, others on hover */}
      <div className="flex gap-1">
        {/* Pin button - 핀 모양 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPin(index)
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            todo.pinned
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100'
          }`}
          title={todo.pinned ? '고정 해제' : '상단 고정'}
        >
          <svg className="w-4 h-4" fill={todo.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v4l2 2v4h-5v6l-1 2-1-2v-6H6v-4l2-2V4a1 1 0 011-1h6a1 1 0 011 1z" />
          </svg>
        </button>
        {/* Bookmark button - 책갈피 모양 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onBookmark(index)
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            todo.bookmarked
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100'
          }`}
          title={todo.bookmarked ? '북마크 해제' : '북마크'}
        >
          <svg className="w-4 h-4" fill={todo.bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleEdit()
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors opacity-0 group-hover:opacity-100"
          title="수정"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(index)
          }}
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

// Overlay component for drag preview
export function TodoItemOverlay({ todo }: { todo: Todo }) {
  return (
    <div
      className={`flex items-center p-4 rounded-2xl border shadow-xl
        ${todo.completed
          ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-800 border-indigo-500'
        }`}
      style={{ opacity: 0.95 }}
    >
      {/* Drag handle */}
      <div className="p-1 mr-2 text-slate-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>

      <input
        type="checkbox"
        checked={todo.completed}
        readOnly
        className="w-5 h-5 rounded-full border-slate-300 dark:border-slate-600
          text-indigo-600 pointer-events-none"
      />
      <span
        className={`ml-3 flex-1 ${
          todo.completed
            ? 'line-through text-slate-400 dark:text-slate-500'
            : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {todo.text}
      </span>
    </div>
  )
}
