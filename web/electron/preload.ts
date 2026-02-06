import { contextBridge, ipcRenderer } from 'electron'

interface Todo {
  text: string
  completed: boolean
  originalDate?: string
  pinned?: boolean
  bookmarked?: boolean
}

interface AppConfig {
  vault_path: string
  autoLaunch?: boolean
}

contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: (date: string): Promise<Todo[]> => {
    return ipcRenderer.invoke('load-todos', date)
  },
  saveTodos: (date: string, todos: Todo[]): Promise<void> => {
    return ipcRenderer.invoke('save-todos', date, todos)
  },
  getConfig: (): Promise<AppConfig | null> => {
    return ipcRenderer.invoke('get-config')
  },
  setConfig: (vaultPath: string): Promise<void> => {
    return ipcRenderer.invoke('set-config', vaultPath)
  },
  getAutoLaunch: (): Promise<boolean> => {
    return ipcRenderer.invoke('get-auto-launch')
  },
  setAutoLaunch: (enabled: boolean): Promise<void> => {
    return ipcRenderer.invoke('set-auto-launch', enabled)
  },
  showNotification: (title: string, body: string): void => {
    ipcRenderer.invoke('show-notification', title, body)
  },
  loadMemo: (name: string): Promise<string> => {
    return ipcRenderer.invoke('load-memo', name)
  },
  saveMemo: (name: string, content: string): Promise<void> => {
    return ipcRenderer.invoke('save-memo', name, content)
  },
  windowMinimize: (): void => {
    ipcRenderer.invoke('window-minimize')
  },
  windowMaximize: (): void => {
    ipcRenderer.invoke('window-maximize')
  },
  windowClose: (): void => {
    ipcRenderer.invoke('window-close')
  },
  windowIsMaximized: (): Promise<boolean> => {
    return ipcRenderer.invoke('window-is-maximized')
  },
})
