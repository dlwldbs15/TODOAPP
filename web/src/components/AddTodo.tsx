import { useState } from 'react'

interface AddTodoProps {
  onAdd: (text: string) => void
}

export function AddTodo({ onAdd }: AddTodoProps) {
  const [text, setText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onAdd(text.trim())
      setText('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative mb-8">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="할 일을 입력하세요..."
        className="w-full p-4 pr-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg
          outline-none focus:ring-2 focus:ring-indigo-500 transition-all
          text-slate-900 dark:text-slate-100
          placeholder-slate-400 dark:placeholder-slate-500"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 text-white rounded-xl
          hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors font-medium"
      >
        추가
      </button>
    </form>
  )
}
