import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import type { Todo } from '../types/todo'

// --- Config Management ---

export interface CapacitorConfig {
  storageMode: 'app' | 'obsidian'
  vaultPath?: string // obsidian 모드에서 File Picker로 선택한 URI
}

export async function getCapacitorConfig(): Promise<CapacitorConfig> {
  const { value } = await Preferences.get({ key: 'todoapp-config' })
  if (value) return JSON.parse(value)
  return { storageMode: 'app' }
}

export async function setCapacitorConfig(config: CapacitorConfig): Promise<void> {
  await Preferences.set({ key: 'todoapp-config', value: JSON.stringify(config) })
}

// --- .md Parsing (mirrors electron/main.ts) ---

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

function parseTodosFromMarkdown(content: string): Todo[] {
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
}

function serializeMetadata(todo: Todo): string {
  const meta: Record<string, unknown> = {}
  if (todo.pinned) meta.pinned = true
  if (todo.bookmarked) meta.bookmarked = true
  if (todo.originalDate) meta.originalDate = todo.originalDate
  if (todo.reminder) meta.reminder = todo.reminder
  if (todo.recurrence) meta.recurrence = todo.recurrence

  if (Object.keys(meta).length === 0) return ''
  return ` <!-- ${JSON.stringify(meta)} -->`
}

function todosToMarkdown(date: string, todos: Todo[]): string {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)

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

  return content
}

// --- Directory helpers ---

async function ensureDirectory(path: string, directory: Directory): Promise<void> {
  try {
    await Filesystem.mkdir({ path, directory, recursive: true })
  } catch {
    // Directory already exists
  }
}

// File Picker URI에서 Filesystem이 사용할 수 있는 경로로 변환
function resolveVaultPath(vaultPath: string, subPath: string): string {
  // file:// URI인 경우 디코딩하여 사용
  let base = vaultPath
  if (base.startsWith('file://')) {
    base = decodeURIComponent(base.replace('file://', ''))
  }
  // 끝의 슬래시 제거
  if (base.endsWith('/')) {
    base = base.slice(0, -1)
  }
  return `${base}/${subPath}`
}

// --- Public API ---

export async function loadTodos(date: string): Promise<Todo[]> {
  const config = await getCapacitorConfig()

  if (config.storageMode === 'obsidian' && config.vaultPath) {
    const filePath = resolveVaultPath(config.vaultPath, `TODO/${date}.md`)
    console.log('[CapStorage] loadTodos path:', filePath)

    try {
      const result = await Filesystem.readFile({
        path: filePath,
        encoding: Encoding.UTF8,
      })
      console.log('[CapStorage] loadTodos success, length:', (result.data as string).length)
      return parseTodosFromMarkdown(result.data as string)
    } catch (error) {
      console.error('[CapStorage] loadTodos error:', error)

      // URI 형식 그대로도 시도
      if (filePath !== `${config.vaultPath}/TODO/${date}.md`) {
        try {
          const result = await Filesystem.readFile({
            path: `${config.vaultPath}/TODO/${date}.md`,
            encoding: Encoding.UTF8,
          })
          console.log('[CapStorage] loadTodos (raw URI) success')
          return parseTodosFromMarkdown(result.data as string)
        } catch (error2) {
          console.error('[CapStorage] loadTodos (raw URI) error:', error2)
        }
      }
      return []
    }
  }

  // 앱 자체 저장소
  try {
    const result = await Filesystem.readFile({
      path: `TODO/${date}.md`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    return parseTodosFromMarkdown(result.data as string)
  } catch {
    return []
  }
}

export async function saveTodos(date: string, todos: Todo[]): Promise<void> {
  const config = await getCapacitorConfig()
  const content = todosToMarkdown(date, todos)

  if (config.storageMode === 'obsidian' && config.vaultPath) {
    const dirPath = resolveVaultPath(config.vaultPath, 'TODO')
    const filePath = resolveVaultPath(config.vaultPath, `TODO/${date}.md`)
    console.log('[CapStorage] saveTodos path:', filePath)

    try {
      await Filesystem.mkdir({ path: dirPath, recursive: true })
    } catch { /* exists */ }

    await Filesystem.writeFile({
      path: filePath,
      data: content,
      encoding: Encoding.UTF8,
    })
    return
  }

  // 앱 자체 저장소
  await ensureDirectory('TODO', Directory.Documents)
  await Filesystem.writeFile({
    path: `TODO/${date}.md`,
    directory: Directory.Documents,
    data: content,
    encoding: Encoding.UTF8,
  })
}

export async function loadMemo(name: string): Promise<string> {
  const config = await getCapacitorConfig()

  if (config.storageMode === 'obsidian' && config.vaultPath) {
    const filePath = resolveVaultPath(config.vaultPath, `TODO/memo/${name}.md`)
    try {
      const result = await Filesystem.readFile({
        path: filePath,
        encoding: Encoding.UTF8,
      })
      return result.data as string
    } catch (error) {
      console.error('[CapStorage] loadMemo error:', error)
      return ''
    }
  }

  try {
    const result = await Filesystem.readFile({
      path: `TODO/memo/${name}.md`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    return result.data as string
  } catch {
    return ''
  }
}

export async function saveMemo(name: string, content: string): Promise<void> {
  const config = await getCapacitorConfig()

  if (config.storageMode === 'obsidian' && config.vaultPath) {
    const dirPath = resolveVaultPath(config.vaultPath, 'TODO/memo')
    const filePath = resolveVaultPath(config.vaultPath, `TODO/memo/${name}.md`)
    try {
      await Filesystem.mkdir({ path: dirPath, recursive: true })
    } catch { /* exists */ }

    await Filesystem.writeFile({
      path: filePath,
      data: content,
      encoding: Encoding.UTF8,
    })
    return
  }

  await ensureDirectory('TODO/memo', Directory.Documents)
  await Filesystem.writeFile({
    path: `TODO/memo/${name}.md`,
    directory: Directory.Documents,
    data: content,
    encoding: Encoding.UTF8,
  })
}

// 디버그용: 볼트 경로의 TODO 폴더 내 파일 목록 조회
export async function listTodoFiles(): Promise<string[]> {
  const config = await getCapacitorConfig()

  try {
    if (config.storageMode === 'obsidian' && config.vaultPath) {
      const dirPath = resolveVaultPath(config.vaultPath, 'TODO')
      console.log('[CapStorage] listing dir:', dirPath)
      const result = await Filesystem.readdir({ path: dirPath })
      const files = result.files.map(f => f.name)
      console.log('[CapStorage] files found:', files)
      return files
    }

    const result = await Filesystem.readdir({
      path: 'TODO',
      directory: Directory.Documents,
    })
    return result.files.map(f => f.name)
  } catch (error) {
    console.error('[CapStorage] listTodoFiles error:', error)
    return []
  }
}
