/**
 * Electron Main Process Entry Point
 *
 * TaskFlow 데스크톱 앱의 메인 프로세스
 */

import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase } from './services/database.service';
import { initializeServices, cleanupServices } from './services';
import { registerAllIPC } from './ipc';
import { createApplicationMenu } from './menu';
import { createTray, destroyTray, updateTrayState } from './tray';
import { loadWindowState, trackWindowState, applyWindowState } from './windowState';

// 환경 변수
const isDev = !app.isPackaged;

// 메인 윈도우 참조
let mainWindow: BrowserWindow | null = null;

/**
 * 메인 윈도우 생성
 */
function createWindow(): void {
  // 저장된 윈도우 상태 불러오기
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 768,
    title: 'TaskFlow',
    backgroundColor: '#050508',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    // macOS 스타일
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
    show: false, // ready-to-show 이벤트에서 표시
  });

  // 윈도우 상태 추적 (위치/크기 변경 시 저장)
  trackWindowState(mainWindow);

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      // 최대화/전체화면 상태 적용
      applyWindowState(mainWindow, windowState);
      mainWindow.show();
    }
  });

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 개발 모드: Vite 개발 서버 로드
  // 프로덕션 모드: 번들된 HTML 로드
  if (isDev) {
    const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 시스템 트레이 생성
  createTray(mainWindow);

  // 윈도우 닫힘 처리
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 앱 초기화
 */
app.whenReady().then(() => {
  // 데이터베이스 초기화
  console.log('[Main] Initializing database...');
  getDatabase();

  // IPC 핸들러 등록
  console.log('[Main] Registering IPC handlers...');
  registerAllIPC();

  // 서비스 초기화 (FileWatcher 등)
  console.log('[Main] Initializing services...');
  initializeServices();

  // 애플리케이션 메뉴 생성
  console.log('[Main] Creating application menu...');
  createApplicationMenu();

  // 메인 윈도우 생성
  createWindow();

  // macOS: dock 아이콘 클릭 시 윈도우 재생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * 모든 윈도우 닫힘 처리
 */
app.on('window-all-closed', () => {
  // macOS: 사용자가 Cmd+Q로 명시적 종료할 때까지 앱 유지
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 앱 종료 전 정리
 */
app.on('before-quit', () => {
  console.log('[Main] Cleaning up before quit...');

  // 트레이 정리
  destroyTray();

  // 서비스 정리 (FileWatcher, AI Worker 등)
  cleanupServices();

  // 데이터베이스 연결 종료
  closeDatabase();
});

/**
 * 보안: 새 윈도우 생성 방지
 */
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // 개발 모드에서 localhost만 허용
    if (isDev && parsedUrl.origin === 'http://localhost:5173') {
      return;
    }
    // 프로덕션에서는 내비게이션 차단
    if (!isDev) {
      event.preventDefault();
    }
  });
});
