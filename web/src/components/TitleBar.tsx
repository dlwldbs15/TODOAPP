import { useState, useEffect, useCallback } from 'react'
import { isElectron } from '../utils/platform'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  const checkMaximized = useCallback(async () => {
    if (isElectron() && window.electronAPI?.windowIsMaximized) {
      const maximized = await window.electronAPI.windowIsMaximized()
      setIsMaximized(maximized)
    }
  }, [])

  useEffect(() => {
    checkMaximized()
    // Check on resize to keep state in sync
    window.addEventListener('resize', checkMaximized)
    return () => window.removeEventListener('resize', checkMaximized)
  }, [checkMaximized])

  const handleMinimize = () => {
    if (isElectron() && window.electronAPI?.windowMinimize) {
      window.electronAPI.windowMinimize()
    }
  }

  const handleMaximize = async () => {
    if (isElectron() && window.electronAPI?.windowMaximize) {
      window.electronAPI.windowMaximize()
      // Small delay to let the window state update
      setTimeout(checkMaximized, 100)
    }
  }

  const handleClose = () => {
    if (isElectron() && window.electronAPI?.windowClose) {
      window.electronAPI.windowClose()
    }
  }

  // Don't render in non-Electron environments
  if (!isElectron()) return null

  return (
    <div className="flex items-center justify-between h-8 bg-white dark:bg-slate-800 select-none border-b border-slate-200 dark:border-slate-700 transition-colors duration-300"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App title */}
      <div className="flex items-center pl-3 gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">TODO App</span>
      </div>

      {/* Window controls */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="최소화"
        >
          <svg className="w-3 h-3 text-slate-600 dark:text-slate-400" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label={isMaximized ? '이전 크기로 복원' : '최대화'}
        >
          {isMaximized ? (
            <svg className="w-3 h-3 text-slate-600 dark:text-slate-400" viewBox="0 0 12 12" fill="none">
              <rect x="2.5" y="0" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none" />
              <rect x="0.5" y="3" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0" className="fill-white dark:fill-slate-800" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-slate-600 dark:text-slate-400" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="10" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center hover:bg-red-500 hover:text-white group transition-colors"
          aria-label="닫기"
        >
          <svg className="w-3 h-3 text-slate-600 dark:text-slate-400 group-hover:text-white" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
