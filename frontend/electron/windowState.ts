/**
 * Window State Management for Electron
 *
 * 윈도우 위치, 크기, 최대화 상태 저장/복원
 */

import { BrowserWindow, screen } from 'electron';
import { getDatabase } from './services/database.service';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1400,
  height: 900,
  isMaximized: false,
  isFullScreen: false,
};

interface DBWindowState {
  x: number | null;
  y: number | null;
  width: number;
  height: number;
  is_maximized: number;
}

/**
 * Load saved window state from database
 */
export function loadWindowState(): WindowState {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT x, y, width, height, is_maximized FROM window_state WHERE id = 1').get() as
      | DBWindowState
      | undefined;

    if (row) {
      const state: WindowState = {
        x: row.x ?? undefined,
        y: row.y ?? undefined,
        width: row.width,
        height: row.height,
        isMaximized: row.is_maximized === 1,
        isFullScreen: false,
      };

      // Validate state is within screen bounds
      if (isStateValid(state)) {
        return state;
      }
    }
  } catch (error) {
    console.error('[WindowState] Failed to load window state:', error);
  }

  return DEFAULT_STATE;
}

/**
 * Save window state to database
 */
export function saveWindowState(window: BrowserWindow): void {
  try {
    const bounds = window.getBounds();
    const isMaximized = window.isMaximized() ? 1 : 0;

    const db = getDatabase();
    db.prepare(`
      UPDATE window_state
      SET x = ?, y = ?, width = ?, height = ?, is_maximized = ?
      WHERE id = 1
    `).run(bounds.x, bounds.y, bounds.width, bounds.height, isMaximized);

    console.log('[WindowState] Saved window state');
  } catch (error) {
    console.error('[WindowState] Failed to save window state:', error);
  }
}

/**
 * Check if window state is valid (within screen bounds)
 */
function isStateValid(state: WindowState): boolean {
  if (!state.x || !state.y) {
    return true; // No position saved, use default centering
  }

  const displays = screen.getAllDisplays();

  // Check if window position is visible on any display
  return displays.some((display) => {
    const { x, y, width, height } = display.bounds;

    // Window should be at least partially visible
    return (
      state.x! < x + width &&
      state.x! + state.width > x &&
      state.y! < y + height &&
      state.y! + state.height > y
    );
  });
}

/**
 * Apply saved state to window
 */
export function applyWindowState(window: BrowserWindow, state: WindowState): void {
  // Set bounds if position is saved
  if (state.x !== undefined && state.y !== undefined) {
    window.setBounds({
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
    });
  }

  // Restore maximized/fullscreen state
  if (state.isMaximized) {
    window.maximize();
  }

  if (state.isFullScreen) {
    window.setFullScreen(true);
  }
}

/**
 * Track window state changes and save on close
 */
export function trackWindowState(window: BrowserWindow): void {
  // Save state periodically when moving/resizing
  let saveTimeout: NodeJS.Timeout | null = null;

  const debouncedSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      if (!window.isDestroyed()) {
        saveWindowState(window);
      }
    }, 500);
  };

  window.on('resize', debouncedSave);
  window.on('move', debouncedSave);

  // Save immediately on close
  window.on('close', () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    if (!window.isDestroyed()) {
      saveWindowState(window);
    }
  });
}
