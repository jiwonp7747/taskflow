/**
 * TerminalPane Component
 *
 * xterm.js 기반 터미널 렌더링 컴포넌트
 */

import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { createPty, writePty, resizePty, killPty, onPtyData, onPtyExit } from '../../lib/terminalIpc';

interface TerminalPaneProps {
  paneId: string;
  cwd: string;
  isActive: boolean;
  onPtyCreated?: (ptyId: string) => void;
  onPtyExited?: (exitCode: number) => void;
  onFocus?: () => void;
}

// TaskFlow 테마에 맞는 xterm 설정
const terminalTheme = {
  background: '#050508',
  foreground: '#e2e8f0',      // slate-200
  cursor: '#06b6d4',          // cyan-500
  cursorAccent: '#050508',
  selectionBackground: 'rgba(6, 182, 212, 0.3)', // cyan-500/30
  selectionForeground: '#ffffff',
  black: '#1e293b',           // slate-800
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  magenta: '#a855f7',
  cyan: '#06b6d4',
  white: '#f8fafc',
  brightBlack: '#475569',     // slate-600
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
};

export function TerminalPane({
  paneId,
  cwd,
  isActive,
  onPtyCreated,
  onPtyExited,
  onFocus,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const cleanupDataRef = useRef<(() => void) | null>(null);
  const cleanupExitRef = useRef<(() => void) | null>(null);

  // 터미널 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    // xterm 인스턴스 생성
    const terminal = new Terminal({
      theme: terminalTheme,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      allowProposedApi: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // PTY 데이터 이벤트 리스너
    cleanupDataRef.current = onPtyData((event) => {
      if (event.ptyId === ptyIdRef.current) {
        terminal.write(event.data);
      }
    });

    // PTY 종료 이벤트 리스너
    cleanupExitRef.current = onPtyExit((event) => {
      if (event.ptyId === ptyIdRef.current) {
        terminal.writeln('');
        terminal.writeln(`\x1b[90m[Process exited with code ${event.exitCode}]\x1b[0m`);
        onPtyExited?.(event.exitCode);
      }
    });

    // PTY 생성
    const initPty = async () => {
      const { cols, rows } = terminal;
      const result = await createPty(cwd, cols, rows);
      if (result) {
        ptyIdRef.current = result.ptyId;
        onPtyCreated?.(result.ptyId);
      } else {
        terminal.writeln('\x1b[31mFailed to create terminal session\x1b[0m');
      }
    };

    initPty();

    // 사용자 입력을 PTY로 전달
    terminal.onData((data) => {
      if (ptyIdRef.current) {
        writePty(ptyIdRef.current, data);
      }
    });

    // 클린업
    return () => {
      cleanupDataRef.current?.();
      cleanupExitRef.current?.();
      if (ptyIdRef.current) {
        killPty(ptyIdRef.current);
      }
      terminal.dispose();
    };
  }, [cwd, onPtyCreated, onPtyExited]);

  // 리사이즈 처리
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current && ptyIdRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = terminalRef.current;
        resizePty(ptyIdRef.current, cols, rows);
      }
    };

    // 디바운스된 리사이즈 핸들러
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

    // 초기 fit
    const initialFitTimeout = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
      clearTimeout(initialFitTimeout);
    };
  }, []);

  // 활성 상태 변경 시 포커스
  useEffect(() => {
    if (isActive && terminalRef.current) {
      terminalRef.current.focus();
    }
  }, [isActive]);

  // 클릭 시 포커스
  const handleClick = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.focus();
      onFocus?.();
    }
  }, [onFocus]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${isActive ? 'ring-1 ring-cyan-500/30' : ''}`}
      onClick={handleClick}
      style={{ padding: '8px' }}
    />
  );
}
