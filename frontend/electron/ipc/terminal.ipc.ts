/**
 * Terminal IPC Handlers
 *
 * PTY 관련 IPC 통신 핸들러
 */

import { ipcMain, BrowserWindow } from 'electron';
import { ptyService } from '../services/pty.service';
import { safeError } from '../lib/safeConsole';

// PTY ID별 이벤트 리스너 정리 함수 저장
const cleanupMap = new Map<string, (() => void)[]>();

export function registerTerminalIPC(): void {
  /**
   * terminal:create - 새 PTY 생성
   */
  ipcMain.handle('terminal:create', (event, { cwd, cols, rows }: {
    cwd: string;
    cols: number;
    rows: number;
  }) => {
    try {
      const { id, pid } = ptyService.create(cwd, cols, rows);
      const win = BrowserWindow.fromWebContents(event.sender);

      // 데이터 이벤트 리스너 등록
      const cleanupData = ptyService.onData(id, (data) => {
        try {
          if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
            win.webContents.send('terminal:data', { ptyId: id, data });
          }
        } catch {
          // Window may have been destroyed between check and send
        }
      });

      // 종료 이벤트 리스너 등록
      const cleanupExit = ptyService.onExit(id, (exitCode, signal) => {
        try {
          if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
            win.webContents.send('terminal:exit', { ptyId: id, exitCode, signal });
          }
        } catch {
          // Window may have been destroyed between check and send
        }
        // 정리 함수 제거
        const cleanups = cleanupMap.get(id);
        if (cleanups) {
          cleanups.forEach(cleanup => cleanup?.());
          cleanupMap.delete(id);
        }
      });

      // 정리 함수 저장
      if (cleanupData || cleanupExit) {
        cleanupMap.set(id, [cleanupData, cleanupExit].filter(Boolean) as (() => void)[]);
      }

      return { success: true, ptyId: id, pid };
    } catch (error) {
      safeError('Failed to create PTY:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * terminal:write - PTY에 데이터 쓰기
   */
  ipcMain.handle('terminal:write', (_event, { ptyId, data }: {
    ptyId: string;
    data: string;
  }) => {
    const success = ptyService.write(ptyId, data);
    return { success };
  });

  /**
   * terminal:resize - PTY 크기 조정
   */
  ipcMain.handle('terminal:resize', (_event, { ptyId, cols, rows }: {
    ptyId: string;
    cols: number;
    rows: number;
  }) => {
    const success = ptyService.resize(ptyId, cols, rows);
    return { success };
  });

  /**
   * terminal:kill - PTY 종료
   */
  ipcMain.handle('terminal:kill', (_event, { ptyId }: { ptyId: string }) => {
    // 정리 함수 실행
    const cleanups = cleanupMap.get(ptyId);
    if (cleanups) {
      cleanups.forEach(cleanup => cleanup?.());
      cleanupMap.delete(ptyId);
    }

    const success = ptyService.kill(ptyId);
    return { success };
  });

  /**
   * terminal:getCwd - 현재 작업 디렉토리 조회
   */
  ipcMain.handle('terminal:getCwd', (_event, { ptyId }: { ptyId: string }) => {
    const cwd = ptyService.getCwd(ptyId);
    return { success: !!cwd, cwd };
  });
}

/**
 * 앱 종료 시 모든 PTY 정리
 */
export function cleanupAllPty(): void {
  // 모든 정리 함수 실행
  for (const [, cleanups] of cleanupMap) {
    cleanups.forEach(cleanup => cleanup?.());
  }
  cleanupMap.clear();

  // 모든 PTY 종료
  ptyService.killAll();
}
