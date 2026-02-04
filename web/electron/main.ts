import { app, BrowserWindow, ipcMain, Menu, Notification } from 'electron'
import path from 'path'
import fs from 'fs'

declare const __dirname: string

const isDev = process.env.NODE_ENV === 'development'

// Windows 알림에서 앱 이름 표시를 위한 설정
app.setAppUserModelId('com.todoapp.app')
app.setName('TODO App')

let mainWindow: typeof BrowserWindow.prototype | null = null

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

interface AppConfig {
  vault_path: string
  autoLaunch?: boolean
}

function loadConfig(): AppConfig | null {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to load config:', error)
  }
  return null
}

function saveConfig(config: Partial<AppConfig>): void {
  try {
    const configPath = getConfigPath()
    const existing = loadConfig() || {}
    const merged = { ...existing, ...config }
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2))
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

function setAutoLaunch(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
  })
  saveConfig({ autoLaunch: enabled })
}

function getAutoLaunch(): boolean {
  const config = loadConfig()
  // 기본값 true
  return config?.autoLaunch !== false
}

function initAutoLaunch(): void {
  const shouldAutoLaunch = getAutoLaunch()
  app.setLoginItemSettings({
    openAtLogin: shouldAutoLaunch,
    path: process.execPath,
  })
}

function getTodoFolder(): string | null {
  const config = loadConfig()
  if (config?.vault_path) {
    return path.join(config.vault_path, 'TODO')
  }
  return null
}

function getMemoFolder(): string | null {
  const todoFolder = getTodoFolder()
  if (todoFolder) {
    return path.join(todoFolder, 'memo')
  }
  return null
}

function ensureMemoFolder(): void {
  const memoFolder = getMemoFolder()
  if (memoFolder && !fs.existsSync(memoFolder)) {
    fs.mkdirSync(memoFolder, { recursive: true })
  }
}

function loadMemo(name: string): string {
  const memoFolder = getMemoFolder()
  if (!memoFolder) return ''

  const filePath = path.join(memoFolder, `${name}.md`)
  if (!fs.existsSync(filePath)) return ''

  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    console.error('Failed to load memo:', error)
    return ''
  }
}

function saveMemo(name: string, content: string): void {
  const memoFolder = getMemoFolder()
  if (!memoFolder) return

  ensureMemoFolder()
  const filePath = path.join(memoFolder, `${name}.md`)

  try {
    fs.writeFileSync(filePath, content, 'utf-8')
  } catch (error) {
    console.error('Failed to save memo:', error)
  }
}

function ensureTodoFolder(): void {
  const todoFolder = getTodoFolder()
  if (todoFolder && !fs.existsSync(todoFolder)) {
    fs.mkdirSync(todoFolder, { recursive: true })
  }
}

interface Todo {
  text: string
  completed: boolean
  originalDate?: string
  pinned?: boolean
  bookmarked?: boolean
}

// 메타데이터 파싱: <!-- {"pinned":true,"bookmarked":true,"originalDate":"2026-02-03"} -->
function parseMetadata(text: string): { cleanText: string; meta: Partial<Todo> } {
  const metaMatch = text.match(/\s*<!--\s*(\{.*?\})\s*-->$/)
  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1])
      const cleanText = text.replace(metaMatch[0], '').trim()
      return { cleanText, meta }
    } catch {
      return { cleanText: text, meta: {} }
    }
  }
  return { cleanText: text, meta: {} }
}

function loadTodos(date: string): Todo[] {
  const todoFolder = getTodoFolder()
  if (!todoFolder) return []

  const filePath = path.join(todoFolder, `${date}.md`)
  if (!fs.existsSync(filePath)) return []

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const todos: Todo[] = []

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('- [ ]')) {
        const { cleanText, meta } = parseMetadata(trimmed.slice(6))
        todos.push({ text: cleanText, completed: false, ...meta })
      } else if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
        const { cleanText, meta } = parseMetadata(trimmed.slice(6))
        todos.push({ text: cleanText, completed: true, ...meta })
      }
    }

    return todos
  } catch (error) {
    console.error('Failed to load todos:', error)
    return []
  }
}

// 메타데이터를 HTML 주석으로 직렬화
function serializeMetadata(todo: Todo): string {
  const meta: Record<string, unknown> = {}
  if (todo.pinned) meta.pinned = true
  if (todo.bookmarked) meta.bookmarked = true
  if (todo.originalDate) meta.originalDate = todo.originalDate

  if (Object.keys(meta).length === 0) return ''
  return ` <!-- ${JSON.stringify(meta)} -->`
}

function saveTodos(date: string, todos: Todo[]): void {
  const todoFolder = getTodoFolder()
  if (!todoFolder) return

  ensureTodoFolder()
  const filePath = path.join(todoFolder, `${date}.md`)

  const now = new Date()
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 19)

  // 고정된 항목을 먼저, 그 다음 미완료, 마지막에 완료
  const pinned = todos.filter(t => t.pinned && !t.completed)
  const incomplete = todos.filter(t => !t.pinned && !t.completed)
  const completed = todos.filter(t => t.completed)

  let content = `# TODO - ${date}\n\n`
  content += `_Last updated: ${timestamp}_\n\n`

  if (pinned.length > 0) {
    content += `## 📌 고정\n\n`
    for (const todo of pinned) {
      content += `- [ ] ${todo.text}${serializeMetadata(todo)}\n`
    }
    content += '\n'
  }

  if (incomplete.length > 0) {
    content += `## 미완료\n\n`
    for (const todo of incomplete) {
      content += `- [ ] ${todo.text}${serializeMetadata(todo)}\n`
    }
    content += '\n'
  }

  if (completed.length > 0) {
    content += `## 완료\n\n`
    for (const todo of completed) {
      content += `- [x] ${todo.text}${serializeMetadata(todo)}\n`
    }
  }

  try {
    fs.writeFileSync(filePath, content, 'utf-8')
  } catch (error) {
    console.error('Failed to save todos:', error)
  }
}

function createWindow(): void {
  // Hide menu bar in production
  if (!isDev) {
    Menu.setApplicationMenu(null)
  }

  mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // In development, load from Vite dev server
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Only open devtools in development
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load from dist folder
    const indexPath = path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(indexPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  initAutoLaunch()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('load-todos', (_event: unknown, date: string) => {
  return loadTodos(date)
})

ipcMain.handle('save-todos', (_event: unknown, date: string, todos: Todo[]) => {
  saveTodos(date, todos)
})

ipcMain.handle('get-config', () => {
  return loadConfig()
})

ipcMain.handle('set-config', (_event: unknown, vaultPath: string) => {
  saveConfig({ vault_path: vaultPath })
  ensureTodoFolder()
})

ipcMain.handle('get-auto-launch', () => {
  return getAutoLaunch()
})

ipcMain.handle('set-auto-launch', (_event: unknown, enabled: boolean) => {
  setAutoLaunch(enabled)
})

ipcMain.handle('show-notification', (_event: unknown, title: string, body: string) => {
  const notification = new Notification({ title, body })
  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  notification.show()
})

ipcMain.handle('load-memo', (_event: unknown, name: string) => {
  return loadMemo(name)
})

ipcMain.handle('save-memo', (_event: unknown, name: string, content: string) => {
  saveMemo(name, content)
})
