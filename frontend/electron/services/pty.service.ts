/**
 * PTY Service
 *
 * node-pty를 사용한 Pseudo Terminal 관리 서비스
 */

import * as pty from 'node-pty';
import * as os from 'os';

interface PtyInstance {
  id: string;
  process: pty.IPty;
  cwd: string;
}

class PtyService {
  private instances: Map<string, PtyInstance> = new Map();

  /**
   * 새 PTY 인스턴스 생성
   */
  create(cwd: string, cols: number, rows: number): { id: string; pid: number } {
    const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh');
    const id = this.generateId();

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      } as Record<string, string>,
      // Windows: use winpty instead of ConPTY to avoid AttachConsole issues in Electron
      useConpty: false,
    });

    const instance: PtyInstance = {
      id,
      process: ptyProcess,
      cwd,
    };

    this.instances.set(id, instance);

    return {
      id,
      pid: ptyProcess.pid,
    };
  }

  /**
   * PTY에 데이터 쓰기 (stdin)
   */
  write(id: string, data: string): boolean {
    const instance = this.instances.get(id);
    if (instance) {
      instance.process.write(data);
      return true;
    }
    return false;
  }

  /**
   * PTY 크기 조정
   */
  resize(id: string, cols: number, rows: number): boolean {
    const instance = this.instances.get(id);
    if (instance) {
      instance.process.resize(cols, rows);
      return true;
    }
    return false;
  }

  /**
   * PTY 종료
   */
  kill(id: string): boolean {
    const instance = this.instances.get(id);
    if (instance) {
      instance.process.kill();
      this.instances.delete(id);
      return true;
    }
    return false;
  }

  /**
   * PTY 데이터 이벤트 리스너 등록
   */
  onData(id: string, callback: (data: string) => void): (() => void) | null {
    const instance = this.instances.get(id);
    if (instance) {
      const disposable = instance.process.onData(callback);
      return () => disposable.dispose();
    }
    return null;
  }

  /**
   * PTY 종료 이벤트 리스너 등록
   */
  onExit(id: string, callback: (exitCode: number, signal?: number) => void): (() => void) | null {
    const instance = this.instances.get(id);
    if (instance) {
      const disposable = instance.process.onExit(({ exitCode, signal }) => {
        callback(exitCode, signal);
        this.instances.delete(id);
      });
      return () => disposable.dispose();
    }
    return null;
  }

  /**
   * 현재 작업 디렉토리 조회
   */
  getCwd(id: string): string | null {
    const instance = this.instances.get(id);
    return instance?.cwd || null;
  }

  /**
   * 모든 PTY 종료
   */
  killAll(): void {
    for (const [id, instance] of this.instances) {
      instance.process.kill();
    }
    this.instances.clear();
  }

  /**
   * 활성 PTY 개수
   */
  getActiveCount(): number {
    return this.instances.size;
  }

  /**
   * 고유 ID 생성
   */
  private generateId(): string {
    return `pty-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const ptyService = new PtyService();
