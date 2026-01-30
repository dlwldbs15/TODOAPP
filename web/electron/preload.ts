import { contextBridge, ipcRenderer } from 'electron'

interface Todo {
  text: string
  completed: boolean
}

contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: (date: string): Promise<Todo[]> => {
    return ipcRenderer.invoke('load-todos', date)
  },
  saveTodos: (date: string, todos: Todo[]): Promise<void> => {
    return ipcRenderer.invoke('save-todos', date, todos)
  },
  getConfig: (): Promise<{ vault_path: string } | null> => {
    return ipcRenderer.invoke('get-config')
  },
  setConfig: (vaultPath: string): Promise<void> => {
    return ipcRenderer.invoke('set-config', vaultPath)
  },
})
