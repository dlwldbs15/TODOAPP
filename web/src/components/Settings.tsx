import { useState, useEffect } from 'react'
import { getPlatform, type Platform } from '../utils/platform'
import {
  getCapacitorConfig,
  setCapacitorConfig,
  type CapacitorConfig,
} from '../services/capacitorStorage'
import { FilePicker } from '@capawesome/capacitor-file-picker'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [vaultPath, setVaultPath] = useState('')
  const [autoLaunch, setAutoLaunch] = useState(true)
  const [saved, setSaved] = useState(false)
  const [platform, setPlatform] = useState<Platform>('web')
  const [capConfig, setCapConfig] = useState<CapacitorConfig>({ storageMode: 'app' })

  useEffect(() => {
    const p = getPlatform()
    setPlatform(p)

    if (p === 'electron' && window.electronAPI) {
      window.electronAPI.getConfig().then((config) => {
        if (config?.vault_path) {
          setVaultPath(config.vault_path)
        }
      })
      window.electronAPI.getAutoLaunch().then((enabled) => {
        setAutoLaunch(enabled)
      })
    }

    if (p === 'capacitor') {
      getCapacitorConfig().then(setCapConfig)
    }
  }, [isOpen])

  // Electron 저장
  const handleSave = async () => {
    if (window.electronAPI && vaultPath.trim()) {
      await window.electronAPI.setConfig(vaultPath.trim())
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
        window.location.reload()
      }, 1000)
    }
  }

  const handleAutoLaunchChange = async (enabled: boolean) => {
    setAutoLaunch(enabled)
    if (window.electronAPI) {
      await window.electronAPI.setAutoLaunch(enabled)
    }
  }

  // Capacitor 저장 방식 변경
  const handleStorageModeChange = async (mode: 'app' | 'obsidian') => {
    const newConfig: CapacitorConfig = { ...capConfig, storageMode: mode }
    await setCapacitorConfig(newConfig)
    setCapConfig(newConfig)
  }

  // Capacitor Obsidian 볼트 폴더 선택
  const handlePickVaultFolder = async () => {
    try {
      const result = await FilePicker.pickDirectory()
      const newConfig: CapacitorConfig = {
        ...capConfig,
        storageMode: 'obsidian',
        vaultPath: result.path,
      }
      await setCapacitorConfig(newConfig)
      setCapConfig(newConfig)
    } catch {
      // 사용자가 취소함
    }
  }

  // Capacitor 저장
  const handleCapSave = async () => {
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
      window.location.reload()
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          설정
        </h2>

        {/* Web 모드 */}
        {platform === 'web' && (
          <div className="text-slate-600 dark:text-slate-400 text-sm">
            <p>Obsidian 연동은 Electron 앱에서만 사용 가능합니다.</p>
            <p className="mt-2">웹 버전에서는 localStorage에 저장됩니다.</p>
          </div>
        )}

        {/* Electron 모드 */}
        {platform === 'electron' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Obsidian Vault 경로
              </label>
              <input
                type="text"
                value={vaultPath}
                onChange={(e) => setVaultPath(e.target.value)}
                placeholder="예: C:\Users\Username\Documents\ObsidianVault"
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700
                  text-slate-900 dark:text-slate-100
                  placeholder-slate-400 dark:placeholder-slate-500
                  outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                TODO 파일이 저장될 Obsidian vault의 경로를 입력하세요.
                <br />
                vault 내에 TODO 폴더가 자동 생성됩니다.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  시작 시 자동 실행
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  컴퓨터 시작 시 앱이 자동으로 실행됩니다
                </p>
              </div>
              <button
                onClick={() => handleAutoLaunchChange(!autoLaunch)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autoLaunch ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    autoLaunch ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {saved && (
              <div className="text-green-600 dark:text-green-400 text-sm font-medium">
                ✓ 저장되었습니다!
              </div>
            )}
          </div>
        )}

        {/* Capacitor 모드 */}
        {platform === 'capacitor' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                저장 방식
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => handleStorageModeChange('app')}
                  className={`w-full p-3 rounded-xl text-left transition-colors ${
                    capConfig.storageMode === 'app'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-700 border-2 border-transparent text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="font-medium block">앱 저장소</span>
                  <span className="text-xs opacity-70">iCloud를 통해 자동 동기화됩니다</span>
                </button>
                <button
                  onClick={() => handleStorageModeChange('obsidian')}
                  className={`w-full p-3 rounded-xl text-left transition-colors ${
                    capConfig.storageMode === 'obsidian'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-700 border-2 border-transparent text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="font-medium block">Obsidian 볼트 연동</span>
                  <span className="text-xs opacity-70">Obsidian 볼트 폴더를 직접 선택합니다</span>
                </button>
              </div>
            </div>

            {capConfig.storageMode === 'obsidian' && (
              <div>
                <button
                  onClick={handlePickVaultFolder}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-700
                    text-slate-700 dark:text-slate-300 font-medium
                    hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors
                    border-2 border-dashed border-slate-300 dark:border-slate-500"
                >
                  폴더 선택
                </button>
                {capConfig.vaultPath && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 break-all">
                    선택됨: {capConfig.vaultPath}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  iCloud Drive에서 Obsidian 볼트 폴더를 선택하세요.
                  <br />
                  볼트 내에 TODO 폴더가 자동 생성됩니다.
                </p>
              </div>
            )}

            {saved && (
              <div className="text-green-600 dark:text-green-400 text-sm font-medium">
                ✓ 저장되었습니다!
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl bg-slate-200 dark:bg-slate-700
              text-slate-700 dark:text-slate-300 font-medium
              hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            닫기
          </button>
          {platform === 'electron' && (
            <button
              onClick={handleSave}
              disabled={!vaultPath.trim()}
              className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 text-white font-medium
                hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              저장
            </button>
          )}
          {platform === 'capacitor' && (
            <button
              onClick={handleCapSave}
              className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 text-white font-medium
                hover:bg-indigo-700 transition-colors"
            >
              저장
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
