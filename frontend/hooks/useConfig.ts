'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AppConfig, SourceConfig, AddSourceRequest } from '@/types/config';
import { DEFAULT_CONFIG } from '@/types/config';

interface UseConfigReturn {
  config: AppConfig;
  loading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  addSource: (data: AddSourceRequest) => Promise<SourceConfig | null>;
  addGitHubSource: (data: {
    name: string;
    url?: string;
    owner?: string;
    repo?: string;
    branch: string;
    rootPath: string;
    token: string;
  }) => Promise<boolean>;
  updateSource: (id: string, data: Partial<SourceConfig>) => Promise<SourceConfig | null>;
  deleteSource: (id: string) => Promise<boolean>;
  setActiveSource: (id: string) => Promise<boolean>;
  toggleSidebar: () => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => Promise<boolean>;
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

      const response = await fetch('/api/config');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch config');
      }

      setConfig(data.config);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Add a new source
  const addSource = useCallback(async (data: AddSourceRequest): Promise<SourceConfig | null> => {
    try {
      setError(null);

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to add source');
      }

      // Refresh config
      await fetchConfig();
      return result.source;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [fetchConfig]);

  // Add a GitHub source
  const addGitHubSource = useCallback(async (data: {
    name: string;
    url?: string;
    owner?: string;
    repo?: string;
    branch: string;
    rootPath: string;
    token: string;
  }): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch('/api/config/sources/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to add GitHub source');
      }

      // Refresh config
      await fetchConfig();
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [fetchConfig]);

  // Update a source
  const updateSource = useCallback(async (id: string, data: Partial<SourceConfig>): Promise<SourceConfig | null> => {
    try {
      setError(null);

      const response = await fetch(`/api/config/sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update source');
      }

      // Refresh config
      await fetchConfig();
      return result.source;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [fetchConfig]);

  // Delete a source
  const deleteSource = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/config/sources/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete source');
      }

      // Refresh config
      await fetchConfig();
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [fetchConfig]);

  // Set active source
  const setActiveSource = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/config/sources/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to set active source');
      }

      // Refresh config
      await fetchConfig();
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [fetchConfig]);

  // Toggle sidebar
  const toggleSidebar = useCallback(async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sidebarCollapsed: !config.sidebarCollapsed }),
      });

      if (response.ok) {
        setConfig(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
      }
    } catch (err) {
      console.error('Failed to toggle sidebar:', err);
    }
  }, [config.sidebarCollapsed]);

  // Set theme
  const setTheme = useCallback(async (theme: 'dark' | 'light'): Promise<boolean> => {
    try {
      setError(null);

      // Apply theme immediately to DOM for instant feedback
      setConfig(prev => ({ ...prev, theme }));
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'cyberpunk' : 'soft');
      }

      // Try to persist to server (may fail in non-Electron mode)
      try {
        const response = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme }),
        });
        return response.ok;
      } catch {
        // API not available (dev mode), but theme is already applied
        return true;
      }
    } catch (err) {
      console.error('Failed to set theme:', err);
      setError(String(err));
      return false;
    }
  }, []);

  return {
    config,
    loading,
    error,
    fetchConfig,
    addSource,
    addGitHubSource,
    updateSource,
    deleteSource,
    setActiveSource,
    toggleSidebar,
    setTheme,
  };
}
