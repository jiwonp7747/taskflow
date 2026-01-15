/**
 * TerminalView Component
 *
 * 터미널 모드 메인 컨테이너
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TerminalTabBar } from './TerminalTabBar';
import { TerminalPane } from './TerminalPane';
import type { TerminalTab, TerminalPane as TerminalPaneType, TerminalViewProps } from './types';

// 임시 ID 생성 함수
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function TerminalView({ initialCwd, onClose, isVisible = true }: TerminalViewProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [activePaneId, setActivePaneId] = useState<string>('');
  const initializedRef = useRef(false);

  // 새 pane 생성 헬퍼
  const createPane = useCallback((cwd: string): TerminalPaneType => {
    return {
      id: generateId(),
      ptyId: '',
      cwd,
      isActive: true,
    };
  }, []);

  // 새 탭 생성
  const createTab = useCallback(() => {
    const cwd = initialCwd || '~';
    const pane = createPane(cwd);
    const newTab: TerminalTab = {
      id: generateId(),
      name: `Tab ${tabs.length + 1}`,
      panes: [pane],
      layout: { type: 'single' },
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setActivePaneId(pane.id);
  }, [tabs.length, initialCwd, createPane]);

  // 초기 탭 생성 (StrictMode에서 중복 생성 방지)
  useEffect(() => {
    if (tabs.length === 0 && !initializedRef.current) {
      initializedRef.current = true;
      createTab();
    }
  }, []);

  // 탭 선택
  const selectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    // 첫 번째 pane을 활성화
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.panes.length > 0) {
      setActivePaneId(tab.panes[0].id);
    }
  }, [tabs]);

  // 탭 닫기
  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);

      // 마지막 탭을 닫으면 터미널 모드 종료
      if (newTabs.length === 0) {
        onClose();
        return prev;
      }

      // 활성 탭을 닫았으면 다른 탭 선택
      if (tabId === activeTabId) {
        const closedIndex = prev.findIndex((t) => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
        if (newTabs[newActiveIndex].panes.length > 0) {
          setActivePaneId(newTabs[newActiveIndex].panes[0].id);
        }
      }

      return newTabs;
    });
  }, [activeTabId, onClose]);

  // Split 요청
  const handleSplitRequest = useCallback((direction: 'horizontal' | 'vertical') => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab || activeTab.panes.length >= 4) return; // 최대 4개 pane

    const cwd = initialCwd || '~';
    const newPane = createPane(cwd);

    setTabs((prev) => prev.map((tab) => {
      if (tab.id !== activeTabId) return tab;

      const newPanes = [...tab.panes, newPane];
      const sizes = newPanes.map(() => 100 / newPanes.length);

      return {
        ...tab,
        panes: newPanes,
        layout: {
          type: direction,
          sizes,
        },
      };
    }));

    setActivePaneId(newPane.id);
  }, [tabs, activeTabId, initialCwd, createPane]);

  // Pane 포커스
  const handlePaneFocus = useCallback((paneId: string) => {
    setActivePaneId(paneId);
  }, []);

  // PTY 생성 콜백
  const handlePtyCreated = useCallback((paneId: string, ptyId: string) => {
    setTabs((prev) => prev.map((tab) => ({
      ...tab,
      panes: tab.panes.map((pane) =>
        pane.id === paneId ? { ...pane, ptyId } : pane
      ),
    })));
  }, []);

  // PTY 종료 콜백
  const handlePtyExited = useCallback((paneId: string, exitCode: number) => {
    // 종료된 pane 제거 또는 표시
    console.log(`Pane ${paneId} exited with code ${exitCode}`);
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘T: 새 탭
      if (e.metaKey && e.key === 't') {
        e.preventDefault();
        createTab();
      }
      // ⌘W: 탭 닫기
      if (e.metaKey && e.key === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
      // ⌘D: Split right
      if (e.metaKey && e.key === 'd' && !e.shiftKey) {
        e.preventDefault();
        handleSplitRequest('horizontal');
      }
      // ⇧⌘D: Split down
      if (e.metaKey && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        handleSplitRequest('vertical');
      }
      // ⌘1-9: 탭 전환
      if (e.metaKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          selectTab(tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createTab, closeTab, selectTab, handleSplitRequest, activeTabId, tabs]);

  // 활성 탭 정보
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // 단일 탭의 panes 렌더링 - 일관된 구조 사용
  const renderTabPanes = (tab: TerminalTab, isTabActive: boolean) => {
    const { panes, layout } = tab;

    const isHorizontal = layout.type === 'horizontal';
    const isSingle = layout.type === 'single' || panes.length === 1;
    const sizes = isSingle
      ? [100]
      : ('sizes' in layout ? layout.sizes : panes.map(() => 100 / panes.length));

    return (
      <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full`}>
        {panes.map((pane, index) => (
          <div
            key={pane.id}
            className="relative h-full"
            style={{
              [isHorizontal ? 'width' : 'height']: `${sizes[index]}%`,
              flex: isSingle ? '1' : 'none',
              minWidth: isHorizontal ? '200px' : undefined,
              minHeight: !isHorizontal ? '100px' : undefined,
            }}
          >
            <TerminalPane
              paneId={pane.id}
              cwd={pane.cwd}
              isActive={pane.id === activePaneId && isTabActive}
              isVisible={isVisible && isTabActive}
              onPtyCreated={(ptyId) => handlePtyCreated(pane.id, ptyId)}
              onPtyExited={(exitCode) => handlePtyExited(pane.id, exitCode)}
              onFocus={() => handlePaneFocus(pane.id)}
            />
            {/* Resize handle (between panes) */}
            {index < panes.length - 1 && (
              <div
                className={`absolute ${
                  isHorizontal
                    ? 'right-0 top-0 bottom-0 w-1 cursor-col-resize'
                    : 'bottom-0 left-0 right-0 h-1 cursor-row-resize'
                } bg-white/5 hover:bg-cyan-500/30 transition-colors`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // 모든 탭의 Panes 렌더링 - 탭 전환 시 세션 유지 (Tab switching fix)
  const renderAllTabs = () => {
    if (tabs.length === 0) return null;

    return (
      <>
        {tabs.map((tab) => {
          const isTabActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{
                display: isTabActive ? 'block' : 'none',
                visibility: isTabActive ? 'visible' : 'hidden',
              }}
            >
              {renderTabPanes(tab, isTabActive)}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-[#050508] rounded-xl border border-white/5 overflow-hidden">
      {/* Tab Bar */}
      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={selectTab}
        onTabClose={closeTab}
        onTabAdd={createTab}
        onSplitRequest={handleSplitRequest}
      />

      {/* Terminal Content - 모든 탭을 렌더링하고 활성 탭만 표시 */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.length > 0 ? (
          renderAllTabs()
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            No terminal tab open
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/30 border-t border-white/5 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span className="text-cyan-400/70">zsh</span>
          <span>{initialCwd || '~/project'}</span>
          {activeTab && activeTab.panes.length > 1 && (
            <span className="text-slate-600">
              {activeTab.panes.length} panes
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-600">
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-500">⌘T</kbd> new tab
          </span>
          <span className="text-slate-600">
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-500">⌘D</kbd> split
          </span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
