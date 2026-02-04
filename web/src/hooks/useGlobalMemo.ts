import { useState, useEffect, useCallback, useRef } from 'react'

const MEMO_STORAGE_KEY = 'memo-global'

export function useGlobalMemo() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const savedContent = useRef('')

  // 메모 로드
  const load = useCallback(async () => {
    setLoading(true)
    try {
      let data = ''
      if (window.electronAPI?.loadMemo) {
        data = await window.electronAPI.loadMemo('global')
      } else {
        data = localStorage.getItem(MEMO_STORAGE_KEY) || ''
      }
      setContent(data)
      savedContent.current = data
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to load memo:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    load()
  }, [load])

  // 내용 변경
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
  }, [])

  // 저장
  const save = useCallback(async () => {
    try {
      if (window.electronAPI?.saveMemo) {
        await window.electronAPI.saveMemo('global', content)
      } else {
        localStorage.setItem(MEMO_STORAGE_KEY, content)
      }
      savedContent.current = content
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save memo:', error)
    }
  }, [content])

  // 변경사항 버리기
  const discard = useCallback(() => {
    setContent(savedContent.current)
    setHasUnsavedChanges(false)
  }, [])

  return {
    content,
    loading,
    hasUnsavedChanges,
    updateContent,
    save,
    discard,
    load,
  }
}
