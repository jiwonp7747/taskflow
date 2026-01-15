/**
 * TerminalPane Component
 *
 * xterm.js 기반 터미널 렌더링 컴포넌트
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { createPty, writePty, resizePty, killPty, onPtyData, onPtyExit } from '../../lib/terminalIpc';

interface TerminalPaneProps {
  paneId: string;
  cwd: string;
  isActive: boolean;
  isVisible?: boolean; // 터미널이 실제로 보이는지 여부
  onPtyCreated?: (ptyId: string) => void;
  onPtyExited?: (exitCode: number) => void;
  onFocus?: () => void;
  onSplitRequest?: (direction: 'horizontal' | 'vertical', position: 'before' | 'after') => void;
  onClosePane?: () => void;
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
  isVisible = true,
  onPtyCreated,
  onPtyExited,
  onFocus,
  onSplitRequest,
  onClosePane,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const cleanupDataRef = useRef<(() => void) | null>(null);
  const cleanupExitRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);
  const fittedRef = useRef(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInitRef = useRef(false);
  const retryCountRef = useRef(0);
  const forceInitRef = useRef(false); // 강제 초기화 플래그 (max retries 후)
  const deferredOpenRef = useRef(false); // open()이 지연된 상태인지
  const MAX_VISIBILITY_RETRIES = 50; // 5초 후 포기 (100ms * 50)

  // 초기화 완료 상태 (visibility useEffect 트리거용)
  const [initReady, setInitReady] = useState(false);

  // 콜백과 props를 ref로 저장하여 useEffect 재실행 방지
  const onPtyCreatedRef = useRef(onPtyCreated);
  const onPtyExitedRef = useRef(onPtyExited);
  const cwdRef = useRef(cwd);
  const isVisibleRef = useRef(isVisible);
  onPtyCreatedRef.current = onPtyCreated;
  onPtyExitedRef.current = onPtyExited;
  cwdRef.current = cwd;
  isVisibleRef.current = isVisible;

  // 터미널 초기화 (paneId 기준으로 한 번만 실행)
  // isVisible은 ref로 체크하여 dependency에 포함하지 않음 (세션 유지를 위해)
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    const container = containerRef.current;
    let terminal: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let animationFrameId: number | null = null;
    let initTimeoutId: NodeJS.Timeout | null = null;

    // 컨테이너가 크기를 가지고 visible할 때까지 기다린 후 초기화
    const initTerminal = () => {
      if (initializedRef.current) return;

      // visibility 체크 (ref 사용으로 dependency 제외)
      // 하지만 max retries 도달 시에도 강제로 초기화 진행 (나중에 visible되면 fit 호출)
      if (!isVisibleRef.current && !forceInitRef.current) {
        retryCountRef.current++;
        // 무한 루프 방지: 최대 재시도 횟수 초과 시 강제 초기화 진행
        if (retryCountRef.current >= MAX_VISIBILITY_RETRIES) {
          console.warn('[TerminalPane] Max visibility retries reached, forcing initialization anyway');
          forceInitRef.current = true; // 강제 초기화 모드 활성화
          // 강제 초기화 시 바로 진행 (아래로 계속)
        } else {
          // 보이지 않으면 대기, 100ms 후 재시도
          initTimeoutId = setTimeout(initTerminal, 100);
          return;
        }
      }
      // visibility 확인 후 retry count 리셋
      retryCountRef.current = 0;

      // 컨테이너 크기 확인 (강제 초기화 모드가 아닐 때만)
      const rect = container.getBoundingClientRect();
      if (!forceInitRef.current && (rect.width === 0 || rect.height === 0)) {
        // 아직 크기가 없으면 다시 시도
        animationFrameId = requestAnimationFrame(initTerminal);
        return;
      }

      // 두 번째 RAF에서 실제 초기화 (DOM 안정화 대기)
      animationFrameId = requestAnimationFrame(() => {
        if (initializedRef.current) return;

        initializedRef.current = true;
        pendingInitRef.current = false;

        // 컨테이너 크기 확인 - 강제 초기화 모드에서 0x0이면 open 지연
        const currentRect = container.getBoundingClientRect();
        const shouldDeferOpen = forceInitRef.current && (currentRect.width === 0 || currentRect.height === 0);

        if (shouldDeferOpen) {
          console.log('[TerminalPane] Container has no dimensions, deferring terminal open');
          deferredOpenRef.current = true;
        } else {
          console.log('[TerminalPane] Container ready, initializing terminal');
        }

        // xterm 인스턴스 생성
        terminal = new Terminal({
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

        fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);

        // 터미널 인스턴스 저장 (open 전이라도 참조 가능하게)
        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // PTY 이벤트 리스너 등록 (open 전에 등록해야 데이터 손실 방지)
        cleanupDataRef.current = onPtyData((event) => {
          if (event.ptyId === ptyIdRef.current && terminalRef.current) {
            terminalRef.current.write(event.data);
          }
        });

        cleanupExitRef.current = onPtyExit((event) => {
          if (event.ptyId === ptyIdRef.current && terminalRef.current) {
            terminalRef.current.writeln('');
            terminalRef.current.writeln(`\x1b[90m[Process exited with code ${event.exitCode}]\x1b[0m`);
            onPtyExitedRef.current?.(event.exitCode);
          }
        });

        // 사용자 입력을 PTY로 전달
        terminal.onData((data) => {
          if (ptyIdRef.current) {
            writePty(ptyIdRef.current, data);
          }
        });

        // open이 지연된 경우 처리
        if (shouldDeferOpen) {
          deferredOpenRef.current = true;
          // initReady를 true로 설정하여 visibility useEffect가 실행되도록 함
          setInitReady(true);
          console.log('[TerminalPane] Terminal instance created with deferred open, initReady set');
          return;
        }

        // setTimeout으로 감싸서 xterm.js 내부 초기화 타이밍 문제 해결
        setTimeout(() => {
          try {
            terminal!.open(container);

            // onRender 이벤트에서 안전하게 첫 fit 수행
            terminal!.onRender(() => {
              if (!fittedRef.current && fitAddon && terminal) {
                try {
                  fitAddon.fit();
                  fittedRef.current = true;
                } catch {
                  // 아직 준비 안됨, 다음 render에서 재시도
                }
              }
            });

            // PTY 생성
            const initPty = async () => {
              if (!terminalRef.current || ptyIdRef.current) return;
              const { cols, rows } = terminalRef.current;
              console.log('[TerminalPane] Creating PTY with:', { cwd: cwdRef.current, cols, rows });
              const result = await createPty(cwdRef.current, cols, rows);
              console.log('[TerminalPane] PTY creation result:', result);
              if (result) {
                ptyIdRef.current = result.ptyId;
                console.log('[TerminalPane] PTY created successfully:', result.ptyId);
                onPtyCreatedRef.current?.(result.ptyId);
              } else {
                console.error('[TerminalPane] Failed to create PTY');
                terminalRef.current?.writeln('\x1b[31mFailed to create terminal session\x1b[0m');
              }
            };

            initPty();
          } catch (e) {
            console.error('[TerminalPane] Failed to open terminal:', e);
            initializedRef.current = false;
          }
        }, 0);
      });
    };

    // 초기화 시작
    initTerminal();

    // 클린업 - paneId가 변경되거나 컴포넌트가 unmount될 때만 실행
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (initTimeoutId !== null) {
        clearTimeout(initTimeoutId);
      }
      cleanupDataRef.current?.();
      cleanupExitRef.current?.();
      if (ptyIdRef.current) {
        killPty(ptyIdRef.current);
        ptyIdRef.current = null;
      }
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
      initializedRef.current = false;
      fittedRef.current = false;
      retryCountRef.current = 0;
      forceInitRef.current = false;
      deferredOpenRef.current = false;
      setInitReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]); // paneId 기준으로만 초기화, isVisible은 ref로 체크

  // isVisible 또는 initReady 변경 시 터미널 처리
  useEffect(() => {
    // deferred open이 필요한 경우: isVisible이 true이고 initReady가 true이고 deferredOpenRef가 true
    const needsDeferredOpen = isVisible && initReady && deferredOpenRef.current;
    // 일반 visibility 변경: 이미 열린 터미널이 visible이 된 경우
    const needsVisibilityUpdate = isVisible && terminalRef.current && !deferredOpenRef.current;

    if (!needsDeferredOpen && !needsVisibilityUpdate) return;

    console.log('[TerminalPane] Effect triggered - isVisible:', isVisible, 'initReady:', initReady, 'deferredOpen:', deferredOpenRef.current);

    // requestAnimationFrame으로 DOM 업데이트 후 실행
    const rafId = requestAnimationFrame(() => {
      // 추가 지연으로 레이아웃 안정화
      setTimeout(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        try {
          // 지연된 open 처리
          if (deferredOpenRef.current && terminalRef.current) {
            console.log('[TerminalPane] Opening deferred terminal');
            deferredOpenRef.current = false;

            terminalRef.current.open(container);

            // fit 수행
            if (fitAddonRef.current) {
              try {
                fitAddonRef.current.fit();
                fittedRef.current = true;
              } catch {
                // silent
              }
            }

            // PTY 생성
            if (!ptyIdRef.current) {
              const { cols, rows } = terminalRef.current;
              console.log('[TerminalPane] Creating PTY (deferred) with:', { cwd: cwdRef.current, cols, rows });
              createPty(cwdRef.current, cols, rows).then((result) => {
                if (result) {
                  ptyIdRef.current = result.ptyId;
                  console.log('[TerminalPane] PTY created successfully:', result.ptyId);
                  onPtyCreatedRef.current?.(result.ptyId);
                } else {
                  console.error('[TerminalPane] Failed to create PTY');
                  terminalRef.current?.writeln('\x1b[31mFailed to create terminal session\x1b[0m');
                }
              });
            }

            // 포커스 설정
            terminalRef.current.focus();
            return;
          }

          // 일반 visibility 변경 처리 (이미 열린 터미널)
          if (terminalRef.current && fitAddonRef.current) {
            console.log('[TerminalPane] Fitting terminal after visibility change');
            fitAddonRef.current.fit();

            // 터미널 강제 새로고침 (렌더링 보장)
            terminalRef.current.refresh(0, terminalRef.current.rows - 1);

            if (ptyIdRef.current) {
              const { cols, rows } = terminalRef.current;
              resizePty(ptyIdRef.current, cols, rows);
            }

            // 포커스 설정
            terminalRef.current.focus();
          }
        } catch (e) {
          console.warn('[TerminalPane] Failed to handle visibility/init change:', e);
        }
      }, 50);
    });

    return () => cancelAnimationFrame(rafId);
  }, [isVisible, initReady]);

  // 리사이즈 처리 - ResizeObserver 사용
  const lastColsRowsRef = useRef<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const handleResize = () => {
      if (!fitAddonRef.current || !terminalRef.current || !container) return;
      if (container.offsetWidth <= 0 || container.offsetHeight <= 0) return;

      try {
        fitAddonRef.current.fit();

        const { cols, rows } = terminalRef.current;
        const key = `${cols}x${rows}`;

        // cols/rows가 실제로 변경된 경우에만 PTY에 알림
        if (ptyIdRef.current && lastColsRowsRef.current !== key) {
          console.log(`[TerminalPane] Resize: ${lastColsRowsRef.current} -> ${key}`);
          lastColsRowsRef.current = key;
          resizePty(ptyIdRef.current, cols, rows);
        }
      } catch {
        // silent fail
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(handleResize, 50);
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
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

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // 우클릭 컨텍스트 메뉴
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 메뉴가 열릴 때 터미널 블러 (입력 방지)
    if (terminalRef.current) {
      terminalRef.current.blur();
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // 메뉴 닫기 (refocus 옵션)
  const closeContextMenu = useCallback((shouldRefocus = true) => {
    setContextMenu(null);
    if (shouldRefocus && terminalRef.current) {
      // 약간의 지연 후 포커스 (DOM 업데이트 대기)
      setTimeout(() => terminalRef.current?.focus(), 10);
    }
  }, []);

  // 메뉴 액션 - split/close 시에는 새 pane이 포커스 받으므로 refocus 안함
  const handleSplit = useCallback((direction: 'horizontal' | 'vertical', position: 'before' | 'after') => {
    closeContextMenu(false); // 먼저 메뉴 닫기 (refocus 안함)
    onSplitRequest?.(direction, position);
  }, [onSplitRequest, closeContextMenu]);

  const handleClose = useCallback(() => {
    closeContextMenu(false);
    onClosePane?.();
  }, [onClosePane, closeContextMenu]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      e.preventDefault();
      closeContextMenu(true); // 외부 클릭 시 refocus
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu, closeContextMenu]);

  return (
    <div className="relative h-full w-full group">
      {/* Terminal Container */}
      <div
        ref={containerRef}
        className={`h-full w-full ${isActive ? 'ring-1 ring-cyan-500/30' : ''}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{ padding: '8px' }}
      />

      {/* Context Menu - Portal로 document.body에 렌더링하여 터미널과 완전히 분리 */}
      {contextMenu && createPortal(
        <div
          className="fixed z-[9999] py-1 bg-slate-900 border border-white/10 rounded-lg shadow-xl min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSplit('horizontal', 'after'); }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <span>Split Right</span>
            <kbd className="text-xs text-slate-500">⌘D</kbd>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSplit('horizontal', 'before'); }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <span>Split Left</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSplit('vertical', 'after'); }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <span>Split Down</span>
            <kbd className="text-xs text-slate-500">⇧⌘D</kbd>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSplit('vertical', 'before'); }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <span>Split Up</span>
          </button>

          <div className="my-1 border-t border-white/5" />

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClose(); }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800/50"
          >
            <span>Close Pane</span>
            <kbd className="text-xs text-slate-500">⌘W</kbd>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
