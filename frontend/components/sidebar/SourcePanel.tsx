'use client';

import { useState } from 'react';
import type { SourceConfig, AddSourceRequest } from '@/types/config';
import { GitHubSourceForm } from './GitHubSourceForm';
import { SyncStatus } from './SyncStatus';

interface SourcePanelProps {
  sources: SourceConfig[];
  activeSourceId: string | null;
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

export function SourcePanel({
  sources,
  activeSourceId,
  onAddSource,
  onAddGitHubSource,
  onUpdateSource,
  onDeleteSource,
  onSetActiveSource,
  onSourceChange,
  onSelectFolder,
}: SourcePanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceTab, setSourceTab] = useState<'local' | 'github'>('local');

  // Handle add source
  const handleAdd = async () => {
    if (!newName.trim() || !newPath.trim()) {
      setError('Name and path are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await onAddSource({ name: newName.trim(), path: newPath.trim() });

    setIsSubmitting(false);

    if (result) {
      setNewName('');
      setNewPath('');
      setIsAdding(false);
      onSourceChange?.();
    } else {
      setError('Failed to add source');
    }
  };

  // Handle set active
  const handleSetActive = async (id: string) => {
    const success = await onSetActiveSource(id);
    if (success) {
      onSourceChange?.();
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) {
      return;
    }

    const success = await onDeleteSource(id);
    if (success) {
      onSourceChange?.();
    }
  };

  // Handle update
  const handleUpdate = async (id: string, name: string) => {
    if (!name.trim()) {
      return;
    }

    await onUpdateSource(id, { name: name.trim() });
    setEditingId(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Task Sources</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
          title="Add source"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add source form */}
      {isAdding && (
        <div className="p-3 bg-slate-900/50 border border-cyan-500/20 rounded-lg space-y-3">
          {/* Tab buttons */}
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg">
            <button
              onClick={() => setSourceTab('local')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                sourceTab === 'local'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Local
            </button>
            <button
              onClick={() => setSourceTab('github')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                sourceTab === 'github'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              GitHub
            </button>
          </div>

          {sourceTab === 'local' ? (
            <>
              {/* Existing local form content */}
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Project Tasks"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder="/path/to/tasks"
                    className="flex-1 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                  {onSelectFolder && (
                    <button
                      type="button"
                      onClick={async () => {
                        const selected = await onSelectFolder();
                        if (selected) setNewPath(selected);
                      }}
                      className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-slate-400 hover:text-white hover:border-cyan-500/50 transition-colors"
                      title="Browse folder"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Source'}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewName('');
                    setNewPath('');
                    setError(null);
                  }}
                  className="px-3 py-2 text-slate-400 text-sm hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <GitHubSourceForm
              onSubmit={async (data) => {
                if (!onAddGitHubSource) return false;
                const success = await onAddGitHubSource(data);
                if (success) {
                  setIsAdding(false);
                  onSourceChange?.();
                }
                return success;
              }}
              onCancel={() => {
                setIsAdding(false);
                setSourceTab('local');
              }}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      )}

      {/* Source list */}
      <div className="space-y-2">
        {sources.length === 0 && !isAdding && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 mb-2">No sources configured</p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Add your first source
            </button>
          </div>
        )}

        {sources.map((source) => (
          <div
            key={source.id}
            className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
              source.id === activeSourceId
                ? 'bg-cyan-500/10 border-cyan-500/30'
                : 'bg-slate-900/30 border-white/5 hover:border-white/10'
            }`}
            onClick={() => {
              if (source.id !== activeSourceId) {
                handleSetActive(source.id);
              }
            }}
          >
            {/* Active indicator */}
            {source.id === activeSourceId && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r" />
            )}

            <div className="flex items-start justify-between">
              {/* Source info */}
              <div className="flex-1 min-w-0 pl-2">
                {editingId === source.id ? (
                  <input
                    type="text"
                    defaultValue={source.name}
                    onBlur={(e) => handleUpdate(source.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdate(source.id, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    className="w-full px-2 py-1 bg-slate-800 border border-cyan-500/50 rounded text-sm text-white focus:outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {source.name}
                    </span>
                    {source.id === activeSourceId && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/20 rounded">
                        Active
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5" title={source.path}>
                  {source.path}
                </p>
                {/* Source type indicator */}
                {'sourceType' in source && source.sourceType === 'github' && (
                  <span className="ml-1 px-1 py-0.5 text-[9px] font-mono uppercase bg-purple-500/20 text-purple-400 rounded">
                    GitHub
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(source.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(source.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Last accessed */}
            {source.lastAccessed && (
              <p className="text-[10px] text-slate-600 mt-2 pl-2">
                Last accessed: {new Date(source.lastAccessed).toLocaleDateString()}
              </p>
            )}

            {/* Sync status for GitHub sources */}
            {'sourceType' in source && source.sourceType === 'github' && source.id === activeSourceId && (
              <SyncStatus
                sourceId={source.id}
                sourceName={source.name}
                isGitHub={true}
                lastSynced={'lastSynced' in source ? source.lastSynced as string : undefined}
                onSync={onSourceChange ? async () => { onSourceChange(); } : undefined}
              />
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="pt-4 border-t border-white/5">
        <p className="text-[10px] font-mono text-slate-600 leading-relaxed">
          Sources are directories containing task markdown files. The active source is used for the kanban board.
        </p>
      </div>
    </div>
  );
}
