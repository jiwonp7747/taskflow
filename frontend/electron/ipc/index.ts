/**
 * IPC Handlers Index
 *
 * 모든 IPC 핸들러 등록 및 내보내기
 */

import { registerTasksIPC } from './tasks.ipc';
import { registerConfigIPC } from './config.ipc';
import { registerSourcesIPC } from './sources.ipc';
import { registerDialogIPC } from './dialog.ipc';
import { registerAIWorkerIPC } from './ai.ipc';
import { registerWindowIPC } from './window.ipc';

/**
 * Register all IPC handlers
 */
export function registerAllIPC(): void {
  console.log('[IPC] Registering all handlers...');

  registerTasksIPC();
  registerConfigIPC();
  registerSourcesIPC();
  registerDialogIPC();
  registerAIWorkerIPC();
  registerWindowIPC();

  console.log('[IPC] All handlers registered');
}

export { registerTasksIPC } from './tasks.ipc';
export { registerConfigIPC } from './config.ipc';
export { registerSourcesIPC } from './sources.ipc';
export { registerDialogIPC } from './dialog.ipc';
export { registerAIWorkerIPC } from './ai.ipc';
export { registerWindowIPC } from './window.ipc';
