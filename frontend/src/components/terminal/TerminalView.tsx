/**
 * TerminalView Component
 *
 * 터미널 모드 메인 컨테이너
 * Flat rendering approach - terminals never unmount on split
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TerminalTabBar } from './TerminalTabBar';
import { TerminalPane } from './TerminalPane';
import { ResizeHandle } from './ResizeHandle';
import type { TerminalTab, PaneNode, TerminalPaneData, SplitPaneData } from './types';

// ID 생성 함수
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// 새 터미널 pane 생성
function createTerminalPane(cwd: string): TerminalPaneData {
  return {
    type: 'terminal',
    id: generateId(),
    ptyId: '',
    cwd,
  };
}

// 초기 탭 생성
function createInitialTab(cwd: string): TerminalTab {
  return {
    id: generateId(),
    name: 'Tab 1',
    rootPane: createTerminalPane(cwd),
  };
}

// Tree 유틸리티 함수들

// 모든 terminal pane 수집
function collectTerminals(node: PaneNode): TerminalPaneData[] {
  if (node.type === 'terminal') {
    return [node];
  }
  return node.children.flatMap(collectTerminals);
}

// Pane의 bounds 계산 (퍼센트)
interface PaneBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function calculatePaneBounds(
  node: PaneNode,
  bounds: PaneBounds = { left: 0, top: 0, width: 100, height: 100 }
): Map<string, PaneBounds> {
  const result = new Map<string, PaneBounds>();

  if (node.type === 'terminal') {
    result.set(node.id, bounds);
    return result;
  }

  const { direction, children, sizes } = node;
  const isHorizontal = direction === 'horizontal';
  let offset = 0;

  for (let i = 0; i < children.length; i++) {
    const size = sizes[i];
    const childBounds: PaneBounds = isHorizontal
      ? {
          left: bounds.left + (offset / 100) * bounds.width,
          top: bounds.top,
          width: (size / 100) * bounds.width,
          height: bounds.height,
        }
      : {
          left: bounds.left,
          top: bounds.top + (offset / 100) * bounds.height,
          width: bounds.width,
          height: (size / 100) * bounds.height,
        };

    const childResults = calculatePaneBounds(children[i], childBounds);
    childResults.forEach((v, k) => result.set(k, v));

    offset += size;
  }

  return result;
}

// Split 정보 수집 (리사이즈 핸들용)
interface SplitInfo {
  id: string;
  direction: 'horizontal' | 'vertical';
  position: number; // 퍼센트
  bounds: PaneBounds; // 핸들의 영역
  index: number;
}

function collectSplits(
  node: PaneNode,
  bounds: PaneBounds = { left: 0, top: 0, width: 100, height: 100 }
): SplitInfo[] {
  if (node.type === 'terminal') {
    return [];
  }

  const result: SplitInfo[] = [];
  const { direction, children, sizes } = node;
  const isHorizontal = direction === 'horizontal';
  let offset = 0;

  for (let i = 0; i < children.length; i++) {
    const size = sizes[i];

    // Add resize handle between children
    if (i < children.length - 1) {
      const handlePosition = offset + size;
      const handleBounds: PaneBounds = isHorizontal
        ? {
            left: bounds.left + (handlePosition / 100) * bounds.width,
            top: bounds.top,
            width: 0,
            height: bounds.height,
          }
        : {
            left: bounds.left,
            top: bounds.top + (handlePosition / 100) * bounds.height,
            width: bounds.width,
            height: 0,
          };

      result.push({
        id: node.id,
        direction,
        position: handlePosition,
        bounds: handleBounds,
        index: i,
      });
    }

    // Recurse into children
    const childBounds: PaneBounds = isHorizontal
      ? {
          left: bounds.left + (offset / 100) * bounds.width,
          top: bounds.top,
          width: (size / 100) * bounds.width,
          height: bounds.height,
        }
      : {
          left: bounds.left,
          top: bounds.top + (offset / 100) * bounds.height,
          width: bounds.width,
          height: (size / 100) * bounds.height,
        };

    result.push(...collectSplits(children[i], childBounds));
    offset += size;
  }

  return result;
}

// pane을 split으로 변환
// position: 'before' = new pane goes left/up, 'after' = new pane goes right/down
function splitPane(
  node: PaneNode,
  targetId: string,
  direction: 'horizontal' | 'vertical',
  newPane: TerminalPaneData,
  position: 'before' | 'after' = 'after'
): PaneNode {
  if (node.id === targetId && node.type === 'terminal') {
    return {
      type: 'split',
      id: generateId(),
      direction,
      children: position === 'before' ? [newPane, node] : [node, newPane],
      sizes: [50, 50],
    };
  }

  if (node.type === 'split') {
    return {
      ...node,
      children: node.children.map(child =>
        splitPane(child, targetId, direction, newPane, position)
      ),
    };
  }

  return node;
}

// pane 닫기
function closePane(node: PaneNode, targetId: string): PaneNode | null {
  if (node.id === targetId) {
    return null;
  }

  if (node.type === 'split') {
    const newChildren = node.children
      .map(child => closePane(child, targetId))
      .filter((child): child is PaneNode => child !== null);

    if (newChildren.length === 0) return null;
    if (newChildren.length === 1) return newChildren[0];

    const totalSize = node.sizes.reduce((a, b) => a + b, 0);
    const newSizes = newChildren.map(() => totalSize / newChildren.length);

    return { ...node, children: newChildren, sizes: newSizes };
  }

  return node;
}

// ptyId 업데이트
function updatePtyId(node: PaneNode, paneId: string, ptyId: string): PaneNode {
  if (node.type === 'terminal' && node.id === paneId) {
    return { ...node, ptyId };
  }

  if (node.type === 'split') {
    return {
      ...node,
      children: node.children.map(child => updatePtyId(child, paneId, ptyId)),
    };
  }

  return node;
}

// split 크기 조정
function resizeSplit(
  node: PaneNode,
  splitId: string,
  index: number,
  deltaPercent: number
): PaneNode {
  if (node.type === 'split' && node.id === splitId) {
    const sizes = [...node.sizes];
    sizes[index] = Math.max(10, sizes[index] + deltaPercent);
    sizes[index + 1] = Math.max(10, sizes[index + 1] - deltaPercent);

    if (sizes[index] < 10 || sizes[index + 1] < 10) return node;
    return { ...node, sizes };
  }

  if (node.type === 'split') {
    return {
      ...node,
      children: node.children.map(child =>
        resizeSplit(child, splitId, index, deltaPercent)
      ),
    };
  }

  return node;
}

// 첫 번째 terminal ID
function getFirstTerminalId(node: PaneNode): string | null {
  if (node.type === 'terminal') return node.id;
  if (node.type === 'split' && node.children.length > 0) {
    return getFirstTerminalId(node.children[0]);
  }
  return null;
}

// terminal 개수
function countTerminals(node: PaneNode): number {
  if (node.type === 'terminal') return 1;
  return node.children.reduce((sum, child) => sum + countTerminals(child), 0);
}

export function TerminalView({ initialCwd, onClose, isVisible = true }: { initialCwd?: string; onClose: () => void; isVisible?: boolean }) {
  const [tabs, setTabs] = useState<TerminalTab[]>(() => {
    const cwd = initialCwd || '~';
    return [createInitialTab(cwd)];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [activePaneId, setActivePaneId] = useState<string>(() => {
    return getFirstTerminalId(tabs[0].rootPane) || '';
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // 새 탭 생성
  const createTab = useCallback(() => {
    const cwd = initialCwd || '~';
    const newTab = createInitialTab(cwd);
    newTab.name = `Tab ${tabs.length + 1}`;

    setTabs(prev => [...prev, newTab]);
    setTimeout(() => {
      setActiveTabId(newTab.id);
      const firstPaneId = getFirstTerminalId(newTab.rootPane);
      if (firstPaneId) setActivePaneId(firstPaneId);
    }, 0);
  }, [initialCwd, tabs.length]);

  // 탭 선택
  const selectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      const firstPaneId = getFirstTerminalId(tab.rootPane);
      if (firstPaneId) setActivePaneId(firstPaneId);
    }
  }, [tabs]);

  // 탭 닫기
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);

      if (newTabs.length === 0) {
        // All tabs closed - close terminal view, let it remount fresh when reopened
        setTimeout(onClose, 0);
        return prev; // Keep current state until unmount
      }

      if (tabId === activeTabId) {
        const closedIndex = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setTimeout(() => {
          setActiveTabId(newTabs[newActiveIndex].id);
          const firstPaneId = getFirstTerminalId(newTabs[newActiveIndex].rootPane);
          if (firstPaneId) setActivePaneId(firstPaneId);
        }, 0);
      }

      return newTabs;
    });
  }, [activeTabId, onClose]);

  // 탭 이름 변경
  const renameTab = useCallback((tabId: string, newName: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  }, []);

  // Pane 포커스
  const handlePaneFocus = useCallback((paneId: string) => {
    setActivePaneId(paneId);
  }, []);

  // PTY 생성 콜백
  const handlePtyCreated = useCallback((paneId: string, ptyId: string) => {
    setTabs(prev => prev.map(tab => ({
      ...tab,
      rootPane: updatePtyId(tab.rootPane, paneId, ptyId),
    })));
  }, []);

  // PTY 종료 콜백
  const handlePtyExited = useCallback((paneId: string, exitCode: number) => {
    console.log(`Pane ${paneId} exited with code ${exitCode}`);
  }, []);

  // Split 요청
  const handleSplitRequest = useCallback((paneId: string, direction: 'horizontal' | 'vertical', position: 'before' | 'after' = 'after') => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    if (countTerminals(activeTab.rootPane) >= 4) return;

    const cwd = initialCwd || '~';
    const newPane = createTerminalPane(cwd);

    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      return {
        ...tab,
        rootPane: splitPane(tab.rootPane, paneId, direction, newPane, position),
      };
    }));

    setTimeout(() => setActivePaneId(newPane.id), 0);
  }, [tabs, activeTabId, initialCwd]);

  // Pane 닫기
  const handleClosePane = useCallback((paneId: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;

      const newRootPane = closePane(tab.rootPane, paneId);

      if (!newRootPane) {
        const cwd = initialCwd || '~';
        const freshPane = createTerminalPane(cwd);
        setTimeout(() => setActivePaneId(freshPane.id), 0);
        return { ...tab, rootPane: freshPane };
      }

      if (paneId === activePaneId) {
        const firstPaneId = getFirstTerminalId(newRootPane);
        if (firstPaneId) setTimeout(() => setActivePaneId(firstPaneId), 0);
      }

      return { ...tab, rootPane: newRootPane };
    }));
  }, [activeTabId, activePaneId, initialCwd]);

  // Pane 리사이즈
  const handlePaneResize = useCallback((splitId: string, index: number, delta: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Find the split to determine direction
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    // Calculate delta as percentage
    const findSplitDirection = (node: PaneNode): 'horizontal' | 'vertical' | null => {
      if (node.type === 'split') {
        if (node.id === splitId) return node.direction;
        for (const child of node.children) {
          const result = findSplitDirection(child);
          if (result) return result;
        }
      }
      return null;
    };

    const direction = findSplitDirection(activeTab.rootPane);
    if (!direction) return;

    const containerSize = direction === 'horizontal' ? containerWidth : containerHeight;
    const deltaPercent = (delta / containerSize) * 100;

    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      return {
        ...tab,
        rootPane: resizeSplit(tab.rootPane, splitId, index, deltaPercent),
      };
    }));
  }, [activeTabId, tabs]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 't') {
        e.preventDefault();
        createTab();
      }
      if (e.metaKey && e.key === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      if (e.metaKey && e.key === 'd' && !e.shiftKey) {
        e.preventDefault();
        if (activePaneId) handleSplitRequest(activePaneId, 'horizontal', 'after');
      }
      if (e.metaKey && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        if (activePaneId) handleSplitRequest(activePaneId, 'vertical', 'after');
      }
      if (e.metaKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (tabs[index]) selectTab(tabs[index].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createTab, closeTab, selectTab, handleSplitRequest, activeTabId, activePaneId, tabs]);

  // 활성 탭
  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-[#050508] rounded-xl border border-white/5 overflow-hidden">
      {/* Tab Bar */}
      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={selectTab}
        onTabClose={closeTab}
        onTabAdd={createTab}
        onTabRename={renameTab}
      />

      {/* Terminal Content - Flat Rendering */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative">
        {tabs.map(tab => {
          const isTabActive = tab.id === activeTabId;
          const terminals = collectTerminals(tab.rootPane);
          const paneBounds = calculatePaneBounds(tab.rootPane);
          const splits = collectSplits(tab.rootPane);

          return (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{
                display: isTabActive ? 'block' : 'none',
                visibility: isTabActive ? 'visible' : 'hidden',
              }}
            >
              {/* Render all terminals flat */}
              {terminals.map(terminal => {
                const bounds = paneBounds.get(terminal.id);
                if (!bounds) return null;

                return (
                  <div
                    key={terminal.id}
                    className="absolute"
                    style={{
                      left: `${bounds.left}%`,
                      top: `${bounds.top}%`,
                      width: `${bounds.width}%`,
                      height: `${bounds.height}%`,
                    }}
                  >
                    <TerminalPane
                      paneId={terminal.id}
                      cwd={terminal.cwd}
                      isActive={terminal.id === activePaneId && isTabActive}
                      isVisible={isVisible && isTabActive}
                      onPtyCreated={(ptyId) => handlePtyCreated(terminal.id, ptyId)}
                      onPtyExited={(exitCode) => handlePtyExited(terminal.id, exitCode)}
                      onFocus={() => handlePaneFocus(terminal.id)}
                      onSplitRequest={(direction: 'horizontal' | 'vertical', position: 'before' | 'after') => handleSplitRequest(terminal.id, direction, position)}
                      onClosePane={() => handleClosePane(terminal.id)}
                    />
                  </div>
                );
              })}

              {/* Render resize handles */}
              {splits.map((split, idx) => (
                <div
                  key={`${split.id}-${idx}`}
                  className="absolute"
                  style={{
                    left: `${split.bounds.left}%`,
                    top: `${split.bounds.top}%`,
                    width: split.direction === 'horizontal' ? '8px' : `${split.bounds.width}%`,
                    height: split.direction === 'vertical' ? '8px' : `${split.bounds.height}%`,
                    transform: split.direction === 'horizontal' ? 'translateX(-4px)' : 'translateY(-4px)',
                    zIndex: 10,
                  }}
                >
                  <ResizeHandle
                    direction={split.direction}
                    onResize={(delta) => handlePaneResize(split.id, split.index, delta)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/30 border-t border-white/5 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span className="text-cyan-400/70">zsh</span>
          <span>{initialCwd || '~/project'}</span>
          {activeTab && countTerminals(activeTab.rootPane) > 1 && (
            <span className="text-slate-600">
              {countTerminals(activeTab.rootPane)} panes
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-600">
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-500">⌘T</kbd> new tab
          </span>
          <span className="text-slate-600">
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-500">Right-click</kbd> split
          </span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
