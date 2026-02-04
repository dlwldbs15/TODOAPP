import { useState } from 'react'

interface AddTodoProps {
  onAdd: (text: string, reminder?: string) => void
}

export function AddTodo({ onAdd }: AddTodoProps) {
  const [text, setText] = useState('')
  const [showReminder, setShowReminder] = useState(false)
  const [reminder, setReminder] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onAdd(text.trim(), reminder || undefined)
      setText('')
      setReminder('')
      setShowReminder(false)
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
          className="w-full p-4 pr-28 rounded-2xl bg-white dark:bg-slate-800 shadow-lg
            outline-none focus:ring-2 focus:ring-indigo-500 transition-all
            text-slate-900 dark:text-slate-100
            placeholder-slate-400 dark:placeholder-slate-500"
        />
        <div className="absolute right-2 top-2 bottom-2 flex gap-1">
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
