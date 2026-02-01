/**
 * Window Control IPC Handlers
 *
 * 윈도우 최소화, 최대화, 닫기 등 제어
 */

import { ipcMain, BrowserWindow } from 'electron';
import { safeLog } from '../lib/safeConsole';

/**
 * Register window control IPC handlers
 */
export function registerWindowIPC(): void {
  // 윈도우 최소화
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.minimize();
    }
  });

  // 윈도우 최대화 토글
  ipcMain.handle('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return win.isMaximized();
    }
    return false;
  });

  // 윈도우 최대화 상태 확인
  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });

  // 윈도우 닫기
  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.close();
    }
  });

  // 윈도우 전체화면 토글
  ipcMain.handle('window:toggleFullScreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setFullScreen(!win.isFullScreen());
      return win.isFullScreen();
    }
    return false;
  });

  // 전체화면 상태 확인
  ipcMain.handle('window:isFullScreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isFullScreen() : false;
  });

  // DevTools 토글
  ipcMain.handle('window:toggleDevTools', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools();
      }
      return win.webContents.isDevToolsOpened();
    }
    return false;
  });

  safeLog('[WindowIPC] Handlers registered');
}
