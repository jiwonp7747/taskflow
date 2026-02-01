/**
 * Dialog IPC Handler
 *
 * 네이티브 다이얼로그 및 앱 정보를 위한 IPC 핸들러
 */

import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { safeLog } from '../lib/safeConsole';

/**
 * Register Dialog IPC handlers
 */
export function registerDialogIPC(): void {
  // Select folder dialog
  ipcMain.handle('dialog:selectFolder', async (): Promise<string | null> => {
    const mainWindow = BrowserWindow.getFocusedWindow();

    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Task Directory',
      buttonLabel: 'Select',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    safeLog('[DialogIPC] Folder selected:', result.filePaths[0]);
    return result.filePaths[0];
  });

  // Get app version
  ipcMain.handle('app:getVersion', async (): Promise<string> => {
    return app.getVersion();
  });

  safeLog('[DialogIPC] Handlers registered');
}
