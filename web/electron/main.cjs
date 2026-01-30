"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
function getConfigPath() {
    return path.join(app.getPath('userData'), 'config.json');
}
function loadConfig() {
    try {
        const configPath = getConfigPath();
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Failed to load config:', error);
    }
    return null;
}
function saveConfig(vaultPath) {
    try {
        const configPath = getConfigPath();
        fs.writeFileSync(configPath, JSON.stringify({ vault_path: vaultPath }, null, 2));
    }
    catch (error) {
        console.error('Failed to save config:', error);
    }
}
function getTodoFolder() {
    const config = loadConfig();
    if (config?.vault_path) {
        return path.join(config.vault_path, 'TODO');
    }
    return null;
}
function ensureTodoFolder() {
    const todoFolder = getTodoFolder();
    if (todoFolder && !fs.existsSync(todoFolder)) {
        fs.mkdirSync(todoFolder, { recursive: true });
    }
}
function loadTodos(date) {
    const todoFolder = getTodoFolder();
    if (!todoFolder)
        return [];
    const filePath = path.join(todoFolder, `${date}.md`);
    if (!fs.existsSync(filePath))
        return [];
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const todos = [];
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- [ ]')) {
                todos.push({ text: trimmed.slice(6), completed: false });
            }
            else if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
                todos.push({ text: trimmed.slice(6), completed: true });
            }
        }
        return todos;
    }
    catch (error) {
        console.error('Failed to load todos:', error);
        return [];
    }
}
function saveTodos(date, todos) {
    const todoFolder = getTodoFolder();
    if (!todoFolder)
        return;
    ensureTodoFolder();
    const filePath = path.join(todoFolder, `${date}.md`);
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
    const incomplete = todos.filter(t => !t.completed);
    const completed = todos.filter(t => t.completed);
    let content = `# TODO - ${date}\n\n`;
    content += `_Last updated: ${timestamp}_\n\n`;
    if (incomplete.length > 0) {
        content += `## 미완료\n\n`;
        for (const todo of incomplete) {
            content += `- [ ] ${todo.text}\n`;
        }
        content += '\n';
    }
    if (completed.length > 0) {
        content += `## 완료\n\n`;
        for (const todo of completed) {
            content += `- [x] ${todo.text}\n`;
        }
    }
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
    }
    catch (error) {
        console.error('Failed to save todos:', error);
    }
}
function createWindow() {
    // Hide menu bar in production
    if (!isDev) {
        Menu.setApplicationMenu(null);
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
    });
    // In development, load from Vite dev server
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // Only open devtools in development
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production, load from dist folder
        const indexPath = path.join(__dirname, '../dist/index.html');
        mainWindow.loadFile(indexPath);
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
// IPC handlers
ipcMain.handle('load-todos', (_event, date) => {
    return loadTodos(date);
});
ipcMain.handle('save-todos', (_event, date, todos) => {
    saveTodos(date, todos);
});
ipcMain.handle('get-config', () => {
    return loadConfig();
});
ipcMain.handle('set-config', (_event, vaultPath) => {
    saveConfig(vaultPath);
    ensureTodoFolder();
});
