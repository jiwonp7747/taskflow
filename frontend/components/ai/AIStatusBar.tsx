'use client';

import { useState } from 'react';
import type { AIWorkerStatus, AIWorkerConfig } from '@/types/ai';

interface AIStatusBarProps {
  status: AIWorkerStatus;
  config: AIWorkerConfig;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
}

export function AIStatusBar({
  status,
  config,
  onStart,
  onStop,
  onPause,
  onResume,
}: AIStatusBarProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      console.error('AI Worker action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine status display
  const getStatusDisplay = () => {
    if (!config.enabled) {
      return { text: 'Disabled', color: 'text-[var(--text-tertiary)]', bgColor: 'bg-[var(--glass-bg)]' };
    }
    if (!status.isRunning) {
      return { text: 'Stopped', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--glass-bg)]' };
    }
    if (status.isPaused) {
      return { text: 'Paused', color: 'text-amber-400', bgColor: 'bg-amber-900/30' };
    }
    if (status.currentTask) {
      return { text: 'Working', color: 'text-cyan-400', bgColor: 'bg-cyan-900/30' };
    }
    return { text: 'Idle', color: 'text-emerald-400', bgColor: 'bg-emerald-900/30' };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--background)]/40 border-b border-[var(--glass-border)] backdrop-blur-sm">
      {/* AI Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusDisplay.bgColor}`}>
          {/* Pulse indicator */}
          <span className="relative flex h-2 w-2">
            {status.isRunning && !status.isPaused && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status.currentTask ? 'bg-cyan-400' : 'bg-emerald-400'
                }`}
              />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                !config.enabled
                  ? 'bg-[var(--text-tertiary)]'
                  : !status.isRunning
                    ? 'bg-[var(--text-secondary)]'
                    : status.isPaused
                      ? 'bg-amber-400'
                      : status.currentTask
                        ? 'bg-cyan-400'
                        : 'bg-emerald-400'
              }`}
            />
          </span>
          <span className={`text-xs font-medium ${statusDisplay.color}`}>
            AI: {statusDisplay.text}
          </span>
        </div>
      </div>

      {/* Current Task */}
      {status.currentTask && (
        <div className="flex items-center gap-2 text-xs text-[var(--neon-cyan)]/80">
          <span className="text-[var(--foreground)]/40">|</span>
          <span className="animate-pulse">🤖</span>
          <span className="max-w-[200px] truncate">{status.currentTaskTitle || status.currentTask}</span>
        </div>
      )}

      {/* Queue Info */}
      {status.queueLength > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--foreground)]/50">
          <span className="text-[var(--foreground)]/40">|</span>
          <span>📋 Queue: {status.queueLength}</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {/* Start/Stop Button */}
        {!status.isRunning ? (
          <button
            onClick={() => handleAction(onStart)}
            disabled={isLoading || !config.enabled}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              isLoading || !config.enabled
                ? 'bg-[var(--foreground)]/5 text-[var(--foreground)]/30 cursor-not-allowed'
                : 'bg-emerald-600/50 text-emerald-200 hover:bg-emerald-600/70 border border-emerald-500/50'
            }`}
          >
            {isLoading ? '...' : '▶ Start'}
          </button>
        ) : (
          <>
            {/* Pause/Resume Button */}
            {status.isPaused ? (
              <button
                onClick={() => handleAction(onResume)}
                disabled={isLoading}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  isLoading
                    ? 'bg-[var(--foreground)]/5 text-[var(--foreground)]/30 cursor-not-allowed'
                    : 'bg-amber-600/50 text-amber-200 hover:bg-amber-600/70 border border-amber-500/50'
                }`}
              >
                {isLoading ? '...' : '▶ Resume'}
              </button>
            ) : (
              <button
                onClick={() => handleAction(onPause)}
                disabled={isLoading}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  isLoading
                    ? 'bg-[var(--foreground)]/5 text-[var(--foreground)]/30 cursor-not-allowed'
                    : 'bg-amber-600/50 text-amber-200 hover:bg-amber-600/70 border border-amber-500/50'
                }`}
              >
                {isLoading ? '...' : '⏸ Pause'}
              </button>
            )}

            {/* Stop Button */}
            <button
              onClick={() => handleAction(onStop)}
              disabled={isLoading}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                isLoading
                  ? 'bg-[var(--foreground)]/5 text-[var(--foreground)]/30 cursor-not-allowed'
                  : 'bg-red-600/50 text-red-200 hover:bg-red-600/70 border border-red-500/50'
              }`}
            >
              {isLoading ? '...' : '⏹ Stop'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
