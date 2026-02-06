"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    loadTodos: (date) => {
        return electron_1.ipcRenderer.invoke('load-todos', date);
    },
    saveTodos: (date, todos) => {
        return electron_1.ipcRenderer.invoke('save-todos', date, todos);
    },
    getConfig: () => {
        return electron_1.ipcRenderer.invoke('get-config');
    },
    setConfig: (vaultPath) => {
        return electron_1.ipcRenderer.invoke('set-config', vaultPath);
    },
    getAutoLaunch: () => {
        return electron_1.ipcRenderer.invoke('get-auto-launch');
    },
    setAutoLaunch: (enabled) => {
        return electron_1.ipcRenderer.invoke('set-auto-launch', enabled);
    },
    showNotification: (title, body) => {
        electron_1.ipcRenderer.invoke('show-notification', title, body);
    },
    loadMemo: (name) => {
        return electron_1.ipcRenderer.invoke('load-memo', name);
    },
    saveMemo: (name, content) => {
        return electron_1.ipcRenderer.invoke('save-memo', name, content);
    },
    windowMinimize: () => {
        electron_1.ipcRenderer.invoke('window-minimize');
    },
    windowMaximize: () => {
        electron_1.ipcRenderer.invoke('window-maximize');
    },
    windowClose: () => {
        electron_1.ipcRenderer.invoke('window-close');
    },
    windowIsMaximized: () => {
        return electron_1.ipcRenderer.invoke('window-is-maximized');
    },
});
