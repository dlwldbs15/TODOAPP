"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_updater_1 = require("electron-updater");
const isDev = process.env.NODE_ENV === 'development';
// Windows 알림에서 앱 이름 표시를 위한 설정
electron_1.app.setAppUserModelId('com.todoapp.app');
electron_1.app.setName('TODO App');
let mainWindow = null;
let tray = null;
let isQuitting = false;
function getConfigPath() {
    return path_1.default.join(electron_1.app.getPath('userData'), 'config.json');
}
function loadConfig() {
    try {
        const configPath = getConfigPath();
        if (fs_1.default.existsSync(configPath)) {
            const data = fs_1.default.readFileSync(configPath, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Failed to load config:', error);
    }
    return null;
}
function saveConfig(config) {
    try {
        const configPath = getConfigPath();
        const existing = loadConfig() || {};
        const merged = { ...existing, ...config };
        fs_1.default.writeFileSync(configPath, JSON.stringify(merged, null, 2));
    }
    catch (error) {
        console.error('Failed to save config:', error);
    }
}
function setAutoLaunch(enabled) {
    electron_1.app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath,
    });
    saveConfig({ autoLaunch: enabled });
}
function getAutoLaunch() {
    const config = loadConfig();
    // 기본값 true
    return config?.autoLaunch !== false;
}
function initAutoLaunch() {
    const shouldAutoLaunch = getAutoLaunch();
    electron_1.app.setLoginItemSettings({
        openAtLogin: shouldAutoLaunch,
        path: process.execPath,
    });
}
function getTodoFolder() {
    const config = loadConfig();
    if (config?.vault_path) {
        return path_1.default.join(config.vault_path, 'TODO');
    }
    return null;
}
function getMemoFolder() {
    const todoFolder = getTodoFolder();
    if (todoFolder) {
        return path_1.default.join(todoFolder, 'memo');
    }
    return null;
}
function ensureMemoFolder() {
    const memoFolder = getMemoFolder();
    if (memoFolder && !fs_1.default.existsSync(memoFolder)) {
        fs_1.default.mkdirSync(memoFolder, { recursive: true });
    }
}
function loadMemo(name) {
    const memoFolder = getMemoFolder();
    if (!memoFolder)
        return '';
    const filePath = path_1.default.join(memoFolder, `${name}.md`);
    if (!fs_1.default.existsSync(filePath))
        return '';
    try {
        return fs_1.default.readFileSync(filePath, 'utf-8');
    }
    catch (error) {
        console.error('Failed to load memo:', error);
        return '';
    }
}
function saveMemo(name, content) {
    const memoFolder = getMemoFolder();
    if (!memoFolder)
        return;
    ensureMemoFolder();
    const filePath = path_1.default.join(memoFolder, `${name}.md`);
    try {
        fs_1.default.writeFileSync(filePath, content, 'utf-8');
    }
    catch (error) {
        console.error('Failed to save memo:', error);
    }
}
function ensureTodoFolder() {
    const todoFolder = getTodoFolder();
    if (todoFolder && !fs_1.default.existsSync(todoFolder)) {
        fs_1.default.mkdirSync(todoFolder, { recursive: true });
    }
}
// 메타데이터 파싱: <!-- {"pinned":true,"bookmarked":true,"originalDate":"2026-02-03"} -->
function parseMetadata(text) {
    const metaMatch = text.match(/\s*<!--\s*(\{.*?\})\s*-->$/);
    if (metaMatch) {
        try {
            const meta = JSON.parse(metaMatch[1]);
            const cleanText = text.replace(metaMatch[0], '').trim();
            return { cleanText, meta };
        }
        catch {
            return { cleanText: text, meta: {} };
        }
    }
    return { cleanText: text, meta: {} };
}
function loadTodos(date) {
    const todoFolder = getTodoFolder();
    if (!todoFolder)
        return [];
    const filePath = path_1.default.join(todoFolder, `${date}.md`);
    if (!fs_1.default.existsSync(filePath))
        return [];
    try {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const todos = [];
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- [ ]')) {
                const { cleanText, meta } = parseMetadata(trimmed.slice(6));
                todos.push({ text: cleanText.replace(/\\n/g, '\n'), completed: false, ...meta });
            }
            else if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
                const { cleanText, meta } = parseMetadata(trimmed.slice(6));
                todos.push({ text: cleanText.replace(/\\n/g, '\n'), completed: true, ...meta });
            }
        }
        return todos;
    }
    catch (error) {
        console.error('Failed to load todos:', error);
        return [];
    }
}
// 메타데이터를 HTML 주석으로 직렬화
function serializeMetadata(todo) {
    const meta = {};
    if (todo.pinned)
        meta.pinned = true;
    if (todo.bookmarked)
        meta.bookmarked = true;
    if (todo.originalDate)
        meta.originalDate = todo.originalDate;
    if (todo.reminder)
        meta.reminder = todo.reminder;
    if (todo.recurrence)
        meta.recurrence = todo.recurrence;
    if (Object.keys(meta).length === 0)
        return '';
    return ` <!-- ${JSON.stringify(meta)} -->`;
}
function saveTodos(date, todos) {
    const todoFolder = getTodoFolder();
    if (!todoFolder)
        return;
    ensureTodoFolder();
    const filePath = path_1.default.join(todoFolder, `${date}.md`);
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
    // 고정된 항목을 먼저, 그 다음 미완료, 마지막에 완료
    const pinned = todos.filter(t => t.pinned && !t.completed);
    const incomplete = todos.filter(t => !t.pinned && !t.completed);
    const completed = todos.filter(t => t.completed);
    let content = `# TODO - ${date}\n\n`;
    content += `_Last updated: ${timestamp}_\n\n`;
    if (pinned.length > 0) {
        content += `## 📌 고정\n\n`;
        for (const todo of pinned) {
            content += `- [ ] ${todo.text.replace(/\n/g, '\\n')}${serializeMetadata(todo)}\n`;
        }
        content += '\n';
    }
    if (incomplete.length > 0) {
        content += `## 미완료\n\n`;
        for (const todo of incomplete) {
            content += `- [ ] ${todo.text.replace(/\n/g, '\\n')}${serializeMetadata(todo)}\n`;
        }
        content += '\n';
    }
    if (completed.length > 0) {
        content += `## 완료\n\n`;
        for (const todo of completed) {
            content += `- [x] ${todo.text.replace(/\n/g, '\\n')}${serializeMetadata(todo)}\n`;
        }
    }
    try {
        fs_1.default.writeFileSync(filePath, content, 'utf-8');
    }
    catch (error) {
        console.error('Failed to save todos:', error);
    }
}
function createWindow() {
    // Hide menu bar in production
    if (!isDev) {
        electron_1.Menu.setApplicationMenu(null);
    }
    mainWindow = new electron_1.BrowserWindow({
        width: 450,
        height: 900,
        frame: false,
        autoHideMenuBar: true,
        icon: path_1.default.join(__dirname, '../build/icon.ico'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.cjs'),
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
        const indexPath = path_1.default.join(__dirname, '../dist/index.html');
        mainWindow.loadFile(indexPath);
    }
    // 닫기 버튼 클릭 시 트레이로 최소화 (실제 종료 아님)
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function createTray() {
    const iconPath = path_1.default.join(__dirname, '../build/icon.ico');
    const icon = electron_1.nativeImage.createFromPath(iconPath);
    tray = new electron_1.Tray(icon);
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: '열기',
            click: () => {
                mainWindow?.show();
                mainWindow?.focus();
            },
        },
        { type: 'separator' },
        {
            label: '종료',
            click: () => {
                isQuitting = true;
                electron_1.app.quit();
            },
        },
    ]);
    tray.setToolTip('TODO App');
    tray.setContextMenu(contextMenu);
    // 트레이 아이콘 더블클릭 시 창 열기
    tray.on('double-click', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
}
function setupAutoUpdater() {
    if (isDev)
        return;
    electron_updater_1.autoUpdater.autoDownload = true;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        electron_1.dialog.showMessageBox({
            type: 'info',
            title: '업데이트 완료',
            message: `새 버전 (v${info.version})이 다운로드되었습니다.\n앱을 재시작하면 업데이트가 적용됩니다.`,
            buttons: ['지금 재시작', '나중에'],
            defaultId: 0,
        }).then((result) => {
            if (result.response === 0) {
                electron_updater_1.autoUpdater.quitAndInstall();
            }
        });
    });
    electron_updater_1.autoUpdater.on('error', (error) => {
        console.error('Auto-update error:', error);
    });
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
}
electron_1.app.whenReady().then(() => {
    createWindow();
    createTray();
    initAutoLaunch();
    setupAutoUpdater();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('before-quit', () => {
    isQuitting = true;
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC handlers
electron_1.ipcMain.handle('load-todos', (_event, date) => {
    return loadTodos(date);
});
electron_1.ipcMain.handle('save-todos', (_event, date, todos) => {
    saveTodos(date, todos);
});
electron_1.ipcMain.handle('get-config', () => {
    return loadConfig();
});
electron_1.ipcMain.handle('set-config', (_event, vaultPath) => {
    saveConfig({ vault_path: vaultPath });
    ensureTodoFolder();
});
electron_1.ipcMain.handle('get-auto-launch', () => {
    return getAutoLaunch();
});
electron_1.ipcMain.handle('set-auto-launch', (_event, enabled) => {
    setAutoLaunch(enabled);
});
electron_1.ipcMain.handle('show-notification', (_event, title, body) => {
    const notification = new electron_1.Notification({ title, body });
    notification.on('click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
    notification.show();
});
electron_1.ipcMain.handle('load-memo', (_event, name) => {
    return loadMemo(name);
});
electron_1.ipcMain.handle('save-memo', (_event, name, content) => {
    saveMemo(name, content);
});
// Window control handlers
electron_1.ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.handle('window-close', () => {
    mainWindow?.close();
});
electron_1.ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
});
