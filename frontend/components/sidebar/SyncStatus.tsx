'use client';

import { useState, useEffect } from 'react';

interface SyncStatusProps {
  sourceId: string;
  sourceName: string;
  isGitHub: boolean;
  lastSynced?: string;
  onSync?: () => Promise<void>;
}

interface SyncState {
  hasUnsavedChanges: boolean;
  unsavedCount: number;
  unsavedFiles: string[];
  isSyncing: boolean;
  error?: string;
}

export function SyncStatus({ sourceId, sourceName, isGitHub, lastSynced, onSync }: SyncStatusProps) {
  const [syncState, setSyncState] = useState<SyncState>({
    hasUnsavedChanges: false,
    unsavedCount: 0,
    unsavedFiles: [],
    isSyncing: false,
  });
  const [showDetails, setShowDetails] = useState(false);

  // Fetch sync status
  const fetchStatus = async () => {
    if (!isGitHub) return;

    try {
      const response = await fetch('/api/sync/status');
      const data = await response.json();

      if (data.sourceId === sourceId) {
        setSyncState(prev => ({
          ...prev,
          hasUnsavedChanges: data.hasUnsavedChanges || false,
          unsavedCount: data.unsavedCount || 0,
          unsavedFiles: data.unsavedFiles || [],
        }));
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [sourceId, isGitHub]);

  // Handle sync action
  const handleSync = async (action: 'pull' | 'push' | 'sync') => {
    setSyncState(prev => ({ ...prev, isSyncing: true, error: undefined }));

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          action,
          commitMessage: `TaskFlow ${action}: ${new Date().toLocaleString()}`,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setSyncState(prev => ({ ...prev, error: result.error }));
      } else {
        // Refresh status
        await fetchStatus();
        onSync?.();
      }
    } catch (err) {
      setSyncState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  if (!isGitHub) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* GitHub icon */}
          <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>

          {/* Sync status indicator */}
          {syncState.hasUnsavedChanges ? (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {syncState.unsavedCount} unsaved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Synced
            </span>
          )}
        </div>

        {/* Sync button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Sync options"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Last synced */}
      {lastSynced && (
        <p className="text-[10px] text-slate-600 mt-1">
          Last synced: {new Date(lastSynced).toLocaleString()}
        </p>
      )}

      {/* Error message */}
      {syncState.error && (
        <p className="text-xs text-red-400 mt-2">{syncState.error}</p>
      )}

      {/* Expanded details */}
      {showDetails && (
        <div className="mt-3 p-3 bg-slate-900/50 border border-white/5 rounded-lg space-y-3">
          {/* Unsaved files list */}
          {syncState.unsavedFiles.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                Unsaved Changes
              </p>
              <ul className="text-xs text-slate-400 space-y-0.5">
                {syncState.unsavedFiles.slice(0, 5).map(file => (
                  <li key={file} className="font-mono truncate">• {file}</li>
                ))}
                {syncState.unsavedFiles.length > 5 && (
                  <li className="text-slate-500">...and {syncState.unsavedFiles.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSync('pull')}
              disabled={syncState.isSyncing}
              className="flex-1 px-3 py-1.5 bg-slate-800 border border-white/10 text-white text-xs rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {syncState.isSyncing ? '...' : '↓ Pull'}
            </button>
            <button
              onClick={() => handleSync('push')}
              disabled={syncState.isSyncing || !syncState.hasUnsavedChanges}
              className="flex-1 px-3 py-1.5 bg-slate-800 border border-white/10 text-white text-xs rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {syncState.isSyncing ? '...' : '↑ Push'}
            </button>
            <button
              onClick={() => handleSync('sync')}
              disabled={syncState.isSyncing}
              className="flex-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:from-purple-400 hover:to-pink-400 transition-all disabled:opacity-50"
            >
              {syncState.isSyncing ? 'Syncing...' : '⟳ Sync'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
