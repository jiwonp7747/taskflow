'use client';

import { useState } from 'react';
import type { AppConfig, SourceConfig, AddSourceRequest } from '@/types/config';
import { SourcePanel } from './SourcePanel';
import { ThemeSelector } from '../settings/ThemeSelector';

interface LeftSidebarProps {
  config: AppConfig;
  isCollapsed: boolean;
  onToggle: () => void;
  onAddSource: (data: AddSourceRequest) => Promise<SourceConfig | null>;
  onAddGitHubSource?: (data: {
    name: string;
    url?: string;
    owner?: string;
    repo?: string;
    branch: string;
    rootPath: string;
    token: string;
  }) => Promise<boolean>;
  onUpdateSource: (id: string, data: Partial<SourceConfig>) => Promise<SourceConfig | null>;
  onDeleteSource: (id: string) => Promise<boolean>;
  onSetActiveSource: (id: string) => Promise<boolean>;
  onSourceChange?: () => void;
  onSelectFolder?: () => Promise<string | null>;
  onSetTheme?: (theme: 'dark' | 'light') => Promise<boolean>;
}

type TabType = 'sources' | 'settings';

export function LeftSidebar({
  config,
  isCollapsed,
  onToggle,
  onAddSource,
  onAddGitHubSource,
  onUpdateSource,
  onDeleteSource,
  onSetActiveSource,
  onSourceChange,
  onSelectFolder,
  onSetTheme,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('sources');

  return (
    <div
      className={`fixed left-0 top-8 h-[calc(100vh-2rem)] z-40 flex transition-all duration-300 ease-out ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
    >
      {/* Main sidebar content */}
      <div className="flex-1 flex flex-col bg-[var(--background)] border-r border-[var(--glass-border)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-[var(--foreground)]">TaskFlow</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 text-[var(--soft-text-muted,#94a3b8)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)] rounded-lg transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {!isCollapsed && (
          <div className="flex border-b border-[var(--glass-border)]">
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'sources'
                  ? 'text-[var(--neon-cyan)] border-b-2 border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5'
                  : 'text-[var(--soft-text-muted,#94a3b8)] hover:text-[var(--foreground)] hover:bg-[var(--soft-hover-bg,rgba(30,41,59,0.3))]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Sources
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-[var(--neon-cyan)] border-b-2 border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5'
                  : 'text-[var(--soft-text-muted,#94a3b8)] hover:text-[var(--foreground)] hover:bg-[var(--soft-hover-bg,rgba(30,41,59,0.3))]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>
        )}

        {/* Collapsed icons */}
        {isCollapsed && (
          <div className="flex flex-col items-center py-4 gap-2">
            <button
              onClick={() => {
                onToggle();
                setActiveTab('sources');
              }}
              className={`p-3 rounded-lg transition-colors ${
                activeTab === 'sources'
                  ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10'
                  : 'text-[var(--soft-text-muted,#94a3b8)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
              }`}
              title="Sources"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => {
                onToggle();
                setActiveTab('settings');
              }}
              className={`p-3 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10'
                  : 'text-[var(--soft-text-muted,#94a3b8)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
              }`}
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* Tab content */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'sources' && (
              <SourcePanel
                sources={config.sources}
                activeSourceId={config.activeSourceId}
                onAddSource={onAddSource}
                onAddGitHubSource={onAddGitHubSource}
                onUpdateSource={onUpdateSource}
                onDeleteSource={onDeleteSource}
                onSetActiveSource={onSetActiveSource}
                onSourceChange={onSourceChange}
                onSelectFolder={onSelectFolder}
              />
            )}
            {activeTab === 'settings' && (
              <div className="p-4 space-y-6">
                {/* Theme Selection */}
                <ThemeSelector
                  currentTheme={config.theme}
                  onThemeChange={onSetTheme || (async () => false)}
                />

                {/* Divider */}
                <div className="border-t border-[var(--glass-border)]" />

                {/* Future settings sections */}
                <div className="text-center py-4">
                  <p className="text-xs text-[var(--soft-text-muted,#64748b)]">
                    More settings coming soon
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-[var(--glass-border)]">
            <div className="text-[10px] font-mono text-[var(--soft-text-secondary,#475569)] text-center">
              TaskFlow v1.0
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
