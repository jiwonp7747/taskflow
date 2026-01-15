/**
 * TerminalTabBar Component
 *
 * 터미널 탭 바 - 탭 네비게이션 및 Split 메뉴
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { TerminalTabBarProps, TerminalTab } from './types';

export function TerminalTabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
  onSplitRequest,
  onTabRename,
}: TerminalTabBarProps) {
  const [isSplitMenuOpen, setIsSplitMenuOpen] = useState(false);
  const splitMenuRef = useRef<HTMLDivElement>(null);

  // 탭 이름 편집 상태
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // 스크롤 상태 (좌우 화살표 표시 여부)
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (splitMenuRef.current && !splitMenuRef.current.contains(event.target as Node)) {
        setIsSplitMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSplit = (direction: 'horizontal' | 'vertical') => {
    onSplitRequest(direction);
    setIsSplitMenuOpen(false);
  };

  // 더블클릭으로 편집 모드 진입
  const handleDoubleClick = useCallback((tab: TerminalTab) => {
    setEditingTabId(tab.id);
    setEditValue(tab.name);
  }, []);

  // 편집 완료
  const handleRenameSubmit = useCallback(() => {
    if (editingTabId && editValue.trim()) {
      onTabRename(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
    setEditValue('');
  }, [editingTabId, editValue, onTabRename]);

  // 편집 취소
  const handleRenameCancel = useCallback(() => {
    setEditingTabId(null);
    setEditValue('');
  }, []);

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  }, [handleRenameSubmit, handleRenameCancel]);

  // 편집 모드 진입 시 input에 포커스
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  // 스크롤 상태 업데이트
  const updateScrollState = useCallback(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // 스크롤 이벤트 및 리사이즈 감지
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener('scroll', updateScrollState);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, tabs.length]);

  // 스크롤 함수
  const scrollTabs = useCallback((direction: 'left' | 'right') => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const scrollAmount = 150;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className="flex items-center justify-between px-2 py-2 bg-slate-900/50 border-b border-white/5 gap-2">
      {/* Tabs with horizontal scroll */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs('left')}
            className="flex-shrink-0 p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded transition-colors"
            title="Scroll left"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Scrollable Tabs Container */}
        <div
          ref={tabsContainerRef}
          className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer transition-colors whitespace-nowrap ${
              tab.id === activeTabId
                ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            onClick={() => {
              if (editingTabId !== tab.id) {
                onTabSelect(tab.id);
              }
            }}
          >
            {/* 탭 이름 - 더블클릭으로 편집 */}
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-cyan-400 outline-none w-20 text-sm px-0 py-0"
                maxLength={20}
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClick(tab);
                }}
                title="Double-click to rename"
              >
                {tab.name}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className={`p-0.5 rounded hover:bg-slate-700/50 transition-colors ${
                tab.id === activeTabId
                  ? 'text-cyan-400/60 hover:text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            onClick={() => scrollTabs('right')}
            className="flex-shrink-0 p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded transition-colors"
            title="Scroll right"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Add Tab Button */}
        <button
          onClick={onTabAdd}
          className="flex-shrink-0 p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-colors"
          title="New Tab (⌘T)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Split Menu */}
      <div className="relative" ref={splitMenuRef}>
        <button
          onClick={() => setIsSplitMenuOpen(!isSplitMenuOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <span>Split</span>
          <svg className={`w-3 h-3 transition-transform ${isSplitMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isSplitMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 py-1 bg-slate-900 border border-white/10 rounded-lg shadow-xl z-50">
            <button
              onClick={() => handleSplit('horizontal')}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <span>Split pane right</span>
              <kbd className="text-xs text-slate-500">⌘D</kbd>
            </button>
            <button
              onClick={() => handleSplit('horizontal')}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <span>Split pane left</span>
              <kbd className="text-xs text-slate-500"></kbd>
            </button>
            <button
              onClick={() => handleSplit('vertical')}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <span>Split pane down</span>
              <kbd className="text-xs text-slate-500">⇧⌘D</kbd>
            </button>
            <button
              onClick={() => handleSplit('vertical')}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <span>Split pane up</span>
              <kbd className="text-xs text-slate-500"></kbd>
            </button>

            <div className="my-1 border-t border-white/5" />

            <button
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <span>Maximize pane</span>
              <kbd className="text-xs text-slate-500">⇧⌘↵</kbd>
            </button>
            <button
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <span>Close pane</span>
              <kbd className="text-xs text-slate-500">⌘W</kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
