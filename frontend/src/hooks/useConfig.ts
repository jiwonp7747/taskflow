/**
 * useConfig Hook for Electron
 *
 * IPC를 통한 앱 설정 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import type { AppConfig, SourceConfig, AddSourceRequest } from '@/types/config';
import { DEFAULT_CONFIG } from '@/types/config';
import * as ipc from '../lib/ipcClient';

interface UseConfigReturn {
  config: AppConfig;
  loading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  addSource: (data: AddSourceRequest) => Promise<SourceConfig | null>;
  updateSource: (
    id: string,
    data: Partial<SourceConfig>
  ) => Promise<SourceConfig | null>;
  deleteSource: (id: string) => Promise<boolean>;
  setActiveSource: (id: string) => Promise<boolean>;
  toggleSidebar: () => Promise<void>;
  selectFolder: () => Promise<string | null>;
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const appConfig = await ipc.getConfig();
      setConfig(appConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Add a new source
  const addSource = useCallback(
    async (data: AddSourceRequest): Promise<SourceConfig | null> => {
      try {
        setError(null);

        const newSource = await ipc.addSource(data.path, data.name);

        // Refresh config
        await fetchConfig();
        return newSource;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [fetchConfig]
  );

  // Update a source
  const updateSource = useCallback(
    async (
      id: string,
      data: Partial<SourceConfig>
    ): Promise<SourceConfig | null> => {
      try {
        setError(null);

        const updatedSource = await ipc.updateSource(id, data);

        // Refresh config
        await fetchConfig();
        return updatedSource;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [fetchConfig]
  );

  // Delete a source
  const deleteSource = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        await ipc.deleteSource(id);

        // Refresh config
        await fetchConfig();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [fetchConfig]
  );

  // Set active source
  const setActiveSource = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        await ipc.setActiveSource(id);

        // Refresh config
        await fetchConfig();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [fetchConfig]
  );

  // Toggle sidebar
  const toggleSidebar = useCallback(async () => {
    try {
      const newConfig = await ipc.updateConfig({
        sidebarCollapsed: !config.sidebarCollapsed,
      });
      setConfig(newConfig);
    } catch (err) {
      console.error('Failed to toggle sidebar:', err);
    }
  }, [config.sidebarCollapsed]);

  // Select folder using native dialog
  const selectFolder = useCallback(async (): Promise<string | null> => {
    try {
      return await ipc.selectFolder();
    } catch (err) {
      console.error('Failed to select folder:', err);
      return null;
    }
  }, []);

  return {
    config,
    loading,
    error,
    fetchConfig,
    addSource,
    updateSource,
    deleteSource,
    setActiveSource,
    toggleSidebar,
    selectFolder,
  };
}
