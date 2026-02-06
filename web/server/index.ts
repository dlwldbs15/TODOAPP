import express from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Config file path (same as Python app - in parent directory)
const CONFIG_FILE = path.join(process.cwd(), '..', 'config.json')

interface Config {
  vault_path: string
}

interface Recurrence {
  type: 'daily' | 'weekly' | 'monthly'
  interval: number
}

interface Todo {
  text: string
  completed: boolean
  originalDate?: string
  pinned?: boolean
  bookmarked?: boolean
  reminder?: string
  recurrence?: Recurrence
}

function loadConfig(): Config | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to load config:', error)
  }
  return null
}

function saveConfig(vaultPath: string): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ vault_path: vaultPath }, null, 2))
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

function getTodoFolder(): string | null {
  const config = loadConfig()
  if (config?.vault_path) {
    return path.join(config.vault_path, 'TODO')
  }
  return null
}

function ensureTodoFolder(): void {
  const todoFolder = getTodoFolder()
  if (todoFolder && !fs.existsSync(todoFolder)) {
    fs.mkdirSync(todoFolder, { recursive: true })
  }
}

// 메타데이터 파싱: <!-- {"pinned":true,"recurrence":{"type":"daily","interval":1}} -->
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
  if (todo.reminder) meta.reminder = todo.reminder
  if (todo.recurrence) meta.recurrence = todo.recurrence

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

function getAllTodos(): { date: string; todos: Todo[] }[] {
  const todoFolder = getTodoFolder()
  if (!todoFolder || !fs.existsSync(todoFolder)) return []

  try {
    const files = fs.readdirSync(todoFolder)
    const result: { date: string; todos: Todo[] }[] = []

    for (const file of files) {
      if (/^\d{4}-\d{2}-\d{2}\.md$/.test(file)) {
        const date = file.replace('.md', '')
        const todos = loadTodos(date)
        if (todos.length > 0) {
          result.push({ date, todos })
        }
      }
    }

    return result.sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    console.error('Failed to get all todos:', error)
    return []
  }
}

// API Routes

// Get config
app.get('/api/config', (_req, res) => {
  const config = loadConfig()
  res.json(config || { vault_path: '' })
})

// Set config
app.put('/api/config', (req, res) => {
  const { vault_path } = req.body
  if (vault_path) {
    saveConfig(vault_path)
    ensureTodoFolder()
    res.json({ success: true })
  } else {
    res.status(400).json({ error: 'vault_path is required' })
  }
})

// Get todos for a specific date
app.get('/api/todos', (req, res) => {
  const date = req.query.date as string
  if (!date) {
    res.status(400).json({ error: 'date parameter is required' })
    return
  }
  const todos = loadTodos(date)
  res.json({ date, todos })
})

// Get all todos
app.get('/api/todos/all', (_req, res) => {
  const allTodos = getAllTodos()
  res.json(allTodos)
})

// Save todos (create or update)
app.post('/api/todos', (req, res) => {
  const { date, todos } = req.body
  if (!date || !todos) {
    res.status(400).json({ error: 'date and todos are required' })
    return
  }
  saveTodos(date, todos)
  res.json({ success: true })
})

// Toggle todo completion
app.put('/api/todos/:date/:index', (req, res) => {
  const { date, index } = req.params
  const idx = parseInt(index, 10)

  const todos = loadTodos(date)
  if (idx < 0 || idx >= todos.length) {
    res.status(400).json({ error: 'Invalid index' })
    return
  }

  todos[idx].completed = !todos[idx].completed
  saveTodos(date, todos)
  res.json({ success: true, todo: todos[idx] })
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Config file: ${CONFIG_FILE}`)
  const config = loadConfig()
  if (config) {
    console.log(`Vault path: ${config.vault_path}`)
  } else {
    console.log('No config found. Set vault path via API.')
  }
})
