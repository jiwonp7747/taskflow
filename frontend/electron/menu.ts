/**
 * Application Menu for Electron
 *
 * macOS 스타일 메뉴 바 구현
 */

import { app, Menu, shell, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { safeLog } from './lib/safeConsole';

const isMac = process.platform === 'darwin';

export function createApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Preferences...',
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                  const win = BrowserWindow.getFocusedWindow();
                  try {
                    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                      win.webContents.send('menu:openSettings');
                    }
                  } catch {
                    // Window may have been destroyed
                  }
                },
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          } as MenuItemConstructorOptions,
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Task',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:newTask');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Refresh Tasks',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:refreshTasks');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' as const }]),
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }]),
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:toggleSidebar');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Board View',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:setView', 'board');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
        {
          label: 'Calendar View',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:setView', 'calendar');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // AI menu
    {
      label: 'AI',
      submenu: [
        {
          label: 'Start AI Worker',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:aiStart');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
        {
          label: 'Stop AI Worker',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:aiStop');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle AI Panel',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:toggleAIPanel');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }, { type: 'separator' as const }, { role: 'window' as const }]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'TaskFlow Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/taskflow/docs');
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/taskflow/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'About TaskFlow',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            try {
              if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                win.webContents.send('menu:showAbout');
              }
            } catch {
              // Window may have been destroyed
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
