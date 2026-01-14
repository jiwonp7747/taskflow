/**
 * Electron API Type Declarations
 *
 * window.api에 노출된 Electron IPC API 타입 정의
 */

export type InvokeChannel =
  | 'tasks:getAll'
  | 'tasks:getById'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:delete'
  | 'config:get'
  | 'config:update'
  | 'sources:getAll'
  | 'sources:add'
  | 'sources:update'
  | 'sources:delete'
  | 'sources:setActive'
  | 'ai:start'
  | 'ai:stop'
  | 'ai:pause'
  | 'ai:resume'
  | 'ai:getStatus'
  | 'ai:getQueue'
  | 'ai:getLogs'
  | 'dialog:selectFolder'
  | 'app:getVersion'
  | 'window:minimize'
  | 'window:toggleMaximize'
  | 'window:isMaximized'
  | 'window:close'
  | 'window:toggleFullScreen'
  | 'window:isFullScreen';

export type ReceiveChannel =
  | 'file:changed'
  | 'ai:statusChanged'
  | 'ai:taskStarted'
  | 'ai:taskCompleted'
  | 'ai:taskFailed'
  | 'ai:log';

export interface ElectronAPI {
  invoke: <T>(channel: InvokeChannel, ...args: unknown[]) => Promise<T>;
  on: (channel: ReceiveChannel, callback: (...args: unknown[]) => void) => () => void;
  once: (channel: ReceiveChannel, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
