/**
 * Terminal IPC Client Functions
 *
 * 터미널 관련 IPC 통신 함수들
 */

import { isElectron } from './ipcClient';
import type { ElectronAPI } from '../types/electron.d';

// Get the Electron API from preload
const api: ElectronAPI | undefined = typeof window !== 'undefined' ? window.api : undefined;

// 응답 타입 정의
interface CreatePtyResponse {
  success: boolean;
  ptyId?: string;
  pid?: number;
  error?: string;
}

interface SimpleResponse {
  success: boolean;
  error?: string;
}

interface CwdResponse {
  success: boolean;
  cwd?: string;
}

interface PtyDataEvent {
  ptyId: string;
  data: string;
}

interface PtyExitEvent {
  ptyId: string;
  exitCode: number;
  signal?: number;
}

/**
 * 새 PTY 생성
 */
export async function createPty(
  cwd: string,
  cols: number,
  rows: number
): Promise<{ ptyId: string; pid: number } | null> {
  if (!isElectron() || !api) return null;

  try {
    const response = await api.invoke<CreatePtyResponse>('terminal:create', { cwd, cols, rows });
    if (response.success && response.ptyId) {
      return { ptyId: response.ptyId, pid: response.pid! };
    }
    console.error('[Terminal] Failed to create PTY:', response.error);
    return null;
  } catch (error) {
    console.error('[Terminal] Error creating PTY:', error);
    return null;
  }
}

/**
 * PTY에 데이터 쓰기
 */
export async function writePty(ptyId: string, data: string): Promise<boolean> {
  if (!isElectron() || !api) return false;

  try {
    const response = await api.invoke<SimpleResponse>('terminal:write', { ptyId, data });
    return response.success;
  } catch (error) {
    console.error('[Terminal] Error writing to PTY:', error);
    return false;
  }
}

/**
 * PTY 크기 조정
 */
export async function resizePty(ptyId: string, cols: number, rows: number): Promise<boolean> {
  if (!isElectron() || !api) return false;

  try {
    const response = await api.invoke<SimpleResponse>('terminal:resize', { ptyId, cols, rows });
    return response.success;
  } catch (error) {
    console.error('[Terminal] Error resizing PTY:', error);
    return false;
  }
}

/**
 * PTY 종료
 */
export async function killPty(ptyId: string): Promise<boolean> {
  if (!isElectron() || !api) return false;

  try {
    const response = await api.invoke<SimpleResponse>('terminal:kill', { ptyId });
    return response.success;
  } catch (error) {
    console.error('[Terminal] Error killing PTY:', error);
    return false;
  }
}

/**
 * PTY 현재 작업 디렉토리 조회
 */
export async function getPtyCwd(ptyId: string): Promise<string | null> {
  if (!isElectron() || !api) return null;

  try {
    const response = await api.invoke<CwdResponse>('terminal:getCwd', { ptyId });
    return response.success ? response.cwd! : null;
  } catch (error) {
    console.error('[Terminal] Error getting PTY cwd:', error);
    return null;
  }
}

/**
 * PTY 데이터 이벤트 리스너 등록
 */
export function onPtyData(callback: (event: PtyDataEvent) => void): (() => void) | null {
  if (!isElectron() || !api) return null;

  return api.on('terminal:data', (data: unknown) => {
    callback(data as PtyDataEvent);
  });
}

/**
 * PTY 종료 이벤트 리스너 등록
 */
export function onPtyExit(callback: (event: PtyExitEvent) => void): (() => void) | null {
  if (!isElectron() || !api) return null;

  return api.on('terminal:exit', (data: unknown) => {
    callback(data as PtyExitEvent);
  });
}
