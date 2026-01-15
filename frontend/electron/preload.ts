/**
 * Electron Preload Script
 *
 * Main Process와 Renderer Process 간의 안전한 통신 브릿지
 * contextIsolation: true 환경에서 contextBridge를 통해 API 노출
 */

import { contextBridge, ipcRenderer } from 'electron';

// 허용된 IPC 채널 (보안을 위해 화이트리스트 방식)
const validInvokeChannels = [
  // Tasks
  'tasks:getAll',
  'tasks:getById',
  'tasks:create',
  'tasks:update',
  'tasks:delete',
  // Config
  'config:get',
  'config:update',
  // Sources
  'sources:getAll',
  'sources:add',
  'sources:update',
  'sources:delete',
  'sources:setActive',
  // AI Worker
  'ai:start',
  'ai:stop',
  'ai:pause',
  'ai:resume',
  'ai:getStatus',
  'ai:getQueue',
  'ai:getLogs',
  // Dialog
  'dialog:selectFolder',
  // App
  'app:getVersion',
  // Window Controls
  'window:minimize',
  'window:toggleMaximize',
  'window:isMaximized',
  'window:close',
  'window:toggleFullScreen',
  'window:isFullScreen',
  'window:toggleDevTools',
  // Terminal
  'terminal:create',
  'terminal:write',
  'terminal:resize',
  'terminal:kill',
  'terminal:getCwd',
] as const;

const validReceiveChannels = [
  // File Watcher Events
  'file:changed',
  // AI Worker Events
  'ai:statusChanged',
  'ai:taskStarted',
  'ai:taskCompleted',
  'ai:taskFailed',
  'ai:log',
  // Terminal Events
  'terminal:data',
  'terminal:exit',
] as const;

type InvokeChannel = typeof validInvokeChannels[number];
type ReceiveChannel = typeof validReceiveChannels[number];

/**
 * API 객체를 렌더러 프로세스에 노출
 */
contextBridge.exposeInMainWorld('api', {
  /**
   * IPC invoke (요청-응답 패턴)
   */
  invoke: <T>(channel: InvokeChannel, ...args: unknown[]): Promise<T> => {
    if (!validInvokeChannels.includes(channel)) {
      return Promise.reject(new Error(`Invalid IPC channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * IPC 이벤트 리스너 등록
   * @returns unsubscribe 함수
   */
  on: (channel: ReceiveChannel, callback: (...args: unknown[]) => void): (() => void) => {
    if (!validReceiveChannels.includes(channel)) {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }

    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    };

    ipcRenderer.on(channel, subscription);

    // unsubscribe 함수 반환
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  /**
   * 일회성 이벤트 리스너
   */
  once: (channel: ReceiveChannel, callback: (...args: unknown[]) => void): void => {
    if (!validReceiveChannels.includes(channel)) {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }

    ipcRenderer.once(channel, (_event, ...args) => {
      callback(...args);
    });
  },
});

// 타입 선언 (렌더러에서 사용)
export type ElectronAPI = {
  invoke: <T>(channel: InvokeChannel, ...args: unknown[]) => Promise<T>;
  on: (channel: ReceiveChannel, callback: (...args: unknown[]) => void) => () => void;
  once: (channel: ReceiveChannel, callback: (...args: unknown[]) => void) => void;
};
