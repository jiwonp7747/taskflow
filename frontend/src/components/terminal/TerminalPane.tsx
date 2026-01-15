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
  isVisible?: boolean; // 터미널이 실제로 보이는지 여부
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
  isVisible = true,
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
  const initializedRef = useRef(false);
  const fittedRef = useRef(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInitRef = useRef(false);
  const retryCountRef = useRef(0);
  const forceInitRef = useRef(false); // 강제 초기화 플래그 (max retries 후)
  const deferredOpenRef = useRef(false); // open()이 지연된 상태인지
  const MAX_VISIBILITY_RETRIES = 50; // 5초 후 포기 (100ms * 50)

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
          // 이미 visible이면 바로 open 진행 (탭 생성 직후 바로 활성화된 경우)
          if (isVisibleRef.current) {
            console.log('[TerminalPane] Deferred but already visible, opening immediately');
            // 다음 프레임에서 컨테이너 크기가 확정된 후 open
            requestAnimationFrame(() => {
              setTimeout(() => {
                if (!terminalRef.current || !containerRef.current) return;

                try {
                  deferredOpenRef.current = false;
                  terminalRef.current.open(containerRef.current);

                  // fit 및 PTY 생성
                  if (fitAddonRef.current) {
                    fitAddonRef.current.fit();
                    fittedRef.current = true;
                  }

                  // PTY 생성
                  if (!ptyIdRef.current) {
                    const { cols, rows } = terminalRef.current;
                    console.log('[TerminalPane] Creating PTY (immediate) with:', { cwd: cwdRef.current, cols, rows });
                    createPty(cwdRef.current, cols, rows).then((result) => {
                      if (result) {
                        ptyIdRef.current = result.ptyId;
                        console.log('[TerminalPane] PTY created successfully:', result.ptyId);
                        onPtyCreatedRef.current?.(result.ptyId);
                      }
                    });
                  }

                  terminalRef.current.focus();
                } catch (e) {
                  console.error('[TerminalPane] Failed to open deferred terminal:', e);
                }
              }, 50);
            });
          } else {
            console.log('[TerminalPane] Terminal instance created, waiting for visibility to open');
          }
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]); // paneId 기준으로만 초기화, isVisible은 ref로 체크

  // isVisible이 true로 변경될 때 터미널 fit 및 포커스
  useEffect(() => {
    if (!isVisible || !terminalRef.current || !fitAddonRef.current || !containerRef.current) return;

    console.log('[TerminalPane] Visibility changed to true, deferredOpen:', deferredOpenRef.current);

    // requestAnimationFrame으로 DOM 업데이트 후 실행
    const rafId = requestAnimationFrame(() => {
      // 추가 지연으로 레이아웃 안정화
      setTimeout(() => {
        if (!terminalRef.current || !fitAddonRef.current || !containerRef.current) return;

        const container = containerRef.current;

        try {
          // 지연된 open 처리
          if (deferredOpenRef.current) {
            console.log('[TerminalPane] Opening deferred terminal');
            deferredOpenRef.current = false;

            terminalRef.current.open(container);

            // onRender 이벤트에서 안전하게 첫 fit 수행
            terminalRef.current.onRender(() => {
              if (!fittedRef.current && fitAddonRef.current && terminalRef.current) {
                try {
                  fitAddonRef.current.fit();
                  fittedRef.current = true;
                } catch {
                  // 아직 준비 안됨, 다음 render에서 재시도
                }
              }
            });

            // PTY 생성 (지연된 경우에만)
            if (!ptyIdRef.current) {
              const initPty = async () => {
                if (!terminalRef.current || ptyIdRef.current) return;
                const { cols, rows } = terminalRef.current;
                console.log('[TerminalPane] Creating PTY (deferred) with:', { cwd: cwdRef.current, cols, rows });
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
            }
          }

          console.log('[TerminalPane] Fitting terminal after visibility change');
          fitAddonRef.current.fit();

          // 터미널 강제 새로고침 (렌더링 보장)
          terminalRef.current.refresh(0, terminalRef.current.rows - 1);

          if (ptyIdRef.current) {
            const { cols, rows } = terminalRef.current;
            console.log('[TerminalPane] Resizing PTY to', cols, 'x', rows);
            resizePty(ptyIdRef.current, cols, rows);
          }

          // 포커스 설정
          terminalRef.current.focus();
        } catch (e) {
          console.warn('[TerminalPane] Failed to handle visibility change:', e);
        }
      }, 50);
    });

    return () => cancelAnimationFrame(rafId);
  }, [isVisible]);

  // 리사이즈 처리 - ResizeObserver 사용 (Issue #4 fix)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const handleResize = () => {
      if (!fitAddonRef.current || !terminalRef.current || !container) return;

      try {
        // 컨테이너 크기가 유효한지 확인
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          fitAddonRef.current.fit();
          if (ptyIdRef.current) {
            const { cols, rows } = terminalRef.current;
            resizePty(ptyIdRef.current, cols, rows);
          }
        }
      } catch {
        // silent fail - terminal not ready yet
      }
    };

    // ResizeObserver로 컨테이너 크기 변화 감지 (split 포함)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          // Debounce fit call
          if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current);
          }
          resizeTimeoutRef.current = setTimeout(handleResize, 50);
        }
      }
    });

    resizeObserver.observe(container);

    // window resize도 감지 (창 크기 변경)
    const debouncedWindowResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedWindowResize);
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

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${isActive ? 'ring-1 ring-cyan-500/30' : ''}`}
      onClick={handleClick}
      style={{ padding: '8px' }}
    />
  );
}
