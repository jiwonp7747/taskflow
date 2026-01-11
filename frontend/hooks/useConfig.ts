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
  updateSource: (id: string, data: Partial<SourceConfig>) => Promise<SourceConfig | null>;
  deleteSource: (id: string) => Promise<boolean>;
  setActiveSource: (id: string) => Promise<boolean>;
  toggleSidebar: () => Promise<void>;
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
  };
}
