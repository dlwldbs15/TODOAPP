import { useState } from 'react'
import type { Recurrence, RecurrenceType } from '../types/todo'

interface AddTodoProps {
  onAdd: (text: string, reminder?: string, recurrence?: Recurrence) => void
}

const recurrenceLabels: Record<RecurrenceType, string> = {
  daily: '일',
  weekly: '주',
  monthly: '월',
}

export function AddTodo({ onAdd }: AddTodoProps) {
  const [text, setText] = useState('')
  const [showReminder, setShowReminder] = useState(false)
  const [reminder, setReminder] = useState('')
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      const recurrence = showRecurrence
        ? { type: recurrenceType, interval: recurrenceInterval }
        : undefined
      onAdd(text.trim(), reminder || undefined, recurrence)
      setText('')
      setReminder('')
      setShowReminder(false)
      setShowRecurrence(false)
      setRecurrenceType('daily')
      setRecurrenceInterval(1)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="할 일을 입력하세요..."
          className="w-full p-4 pr-36 rounded-2xl bg-white dark:bg-slate-800 shadow-lg
            outline-none focus:ring-2 focus:ring-indigo-500 transition-all
            text-slate-900 dark:text-slate-100
            placeholder-slate-400 dark:placeholder-slate-500"
        />
        <div className="absolute right-2 top-2 bottom-2 flex gap-1">
          {/* 주기 반복 버튼 */}
          <button
            type="button"
            onClick={() => setShowRecurrence(!showRecurrence)}
            className={`px-3 rounded-xl transition-colors ${
              showRecurrence
                ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            title="주기 반복 설정"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {/* 리마인더 버튼 */}
          <button
            type="button"
            onClick={() => setShowReminder(!showReminder)}
            className={`px-3 rounded-xl transition-colors ${
              showReminder || reminder
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            title="리마인더 설정"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-4 bg-indigo-600 text-white rounded-xl
              hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors font-medium"
          >
            추가
          </button>
        </div>
      </div>

      {/* 주기 반복 설정 */}
      {showRecurrence && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 shadow-md">
          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm text-slate-600 dark:text-slate-300">매</span>
          <input
            type="number"
            min={1}
            max={365}
            value={recurrenceInterval}
            onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700
              text-slate-900 dark:text-slate-100 outline-none text-sm text-center"
          />
          <div className="flex gap-1">
            {(Object.keys(recurrenceLabels) as RecurrenceType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setRecurrenceType(type)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  recurrenceType === type
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {recurrenceLabels[type]}
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-300">마다</span>
          <button
            type="button"
            onClick={() => setShowRecurrence(false)}
            className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors ml-auto"
            title="주기 설정 취소"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 리마인더 입력 */}
      {showReminder && (
        <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 shadow-md">
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <input
            type="datetime-local"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className="flex-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700
              text-slate-900 dark:text-slate-100 outline-none text-sm"
          />
          {reminder && (
            <button
              type="button"
              onClick={() => setReminder('')}
              className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
              title="리마인더 삭제"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </form>
  )
}
