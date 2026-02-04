import { useGlobalMemo } from '../hooks/useGlobalMemo'

interface MemoPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function MemoPanel({ isOpen, onClose }: MemoPanelProps) {
  const { content, loading, hasUnsavedChanges, updateContent, save, discard } = useGlobalMemo()

  if (!isOpen) return null

  const handleSave = async () => {
    await save()
  }

  const handleClose = () => {
    discard()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            메모
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-500 font-normal">(저장 안됨)</span>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-slate-500">로딩 중...</div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="메모를 입력하세요..."
              className="w-full h-80 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`w-full py-2 rounded-xl font-medium transition-colors ${
              hasUnsavedChanges
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
