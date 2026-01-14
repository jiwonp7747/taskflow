/**
 * System Tray for Electron
 *
 * 시스템 트레이 아이콘 및 메뉴 구현
 */

import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import path from 'path';

let tray: Tray | null = null;

interface TrayState {
  aiWorkerRunning: boolean;
  taskCount: number;
}

let currentState: TrayState = {
  aiWorkerRunning: false,
  taskCount: 0,
};

/**
 * Create system tray
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  // Create tray icon
  // Use a 16x16 or 22x22 template image for macOS
  const iconPath = process.platform === 'darwin'
    ? path.join(__dirname, '../resources/tray-iconTemplate.png')
    : path.join(__dirname, '../resources/tray-icon.png');

  // Create a simple icon if the file doesn't exist
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      throw new Error('Icon is empty');
    }
  } catch {
    // Create a simple colored icon as fallback
    icon = createDefaultIcon();
  }

  tray = new Tray(icon);
  tray.setToolTip('TaskFlow');

  // Update context menu
  updateTrayMenu(mainWindow);

  // Click behavior
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  return tray;
}

/**
 * Create default icon when icon file is not available
 */
function createDefaultIcon(): Electron.NativeImage {
  // Create a simple 16x16 icon
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  // Fill with a cyan color (TaskFlow brand color)
  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    // Create a simple circular shape
    const x = i % size;
    const y = Math.floor(i / size);
    const centerX = size / 2;
    const centerY = size / 2;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

    if (distance < size / 2 - 1) {
      // Cyan color: RGB(6, 182, 212)
      canvas[offset] = 6;       // R
      canvas[offset + 1] = 182; // G
      canvas[offset + 2] = 212; // B
      canvas[offset + 3] = 255; // A
    } else {
      // Transparent
      canvas[offset + 3] = 0;
    }
  }

  return nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size,
  });
}

/**
 * Update tray context menu
 */
function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'TaskFlow',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: currentState.aiWorkerRunning ? '🟢 AI Worker Running' : '⚪ AI Worker Stopped',
      enabled: false,
    },
    {
      label: `📋 ${currentState.taskCount} Tasks`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: currentState.aiWorkerRunning ? 'Stop AI Worker' : 'Start AI Worker',
      click: () => {
        mainWindow.webContents.send(
          currentState.aiWorkerRunning ? 'menu:aiStop' : 'menu:aiStart'
        );
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Update tray state
 */
export function updateTrayState(state: Partial<TrayState>, mainWindow: BrowserWindow): void {
  currentState = { ...currentState, ...state };
  updateTrayMenu(mainWindow);

  // Update tooltip
  if (tray) {
    const status = currentState.aiWorkerRunning ? 'AI Running' : 'AI Stopped';
    tray.setToolTip(`TaskFlow - ${currentState.taskCount} tasks - ${status}`);
  }
}

/**
 * Destroy tray
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
