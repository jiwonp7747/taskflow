'use client';

import { useState } from 'react';
import type { AppConfig, SourceConfig, AddSourceRequest } from '@/types/config';
import { SourcePanel } from './SourcePanel';

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
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('sources');

  return (
    <div
      className={`fixed left-0 top-8 h-[calc(100vh-2rem)] z-40 flex transition-all duration-300 ease-out ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
    >
      {/* Main sidebar content */}
      <div className="flex-1 flex flex-col bg-slate-950 border-r border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-white">TaskFlow</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
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
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'sources'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
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
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
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
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
              <div className="p-4">
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Settings coming soon</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-white/5">
            <div className="text-[10px] font-mono text-slate-600 text-center">
              TaskFlow v1.0
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
