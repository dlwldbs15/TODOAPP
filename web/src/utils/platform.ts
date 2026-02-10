import { Capacitor } from '@capacitor/core'

export type Platform = 'electron' | 'capacitor' | 'web'

export const getPlatform = (): Platform => {
  if (typeof window !== 'undefined' && window.electronAPI !== undefined) return 'electron'
  if (Capacitor.isNativePlatform()) return 'capacitor'
  return 'web'
}

export const isElectron = (): boolean => getPlatform() === 'electron'
export const isCapacitor = (): boolean => getPlatform() === 'capacitor'
export const isWeb = (): boolean => getPlatform() === 'web'
