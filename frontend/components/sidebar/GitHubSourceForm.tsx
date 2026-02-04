'use client';

import { useState } from 'react';
import { parseGitHubUrl } from '@/core/domain/entities/GitHubSourceConfig';

interface GitHubSourceFormProps {
  onSubmit: (data: {
    name: string;
    url?: string;
    owner?: string;
    repo?: string;
    branch: string;
    rootPath: string;
    token: string;
  }) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function GitHubSourceForm({ onSubmit, onCancel, isSubmitting = false }: GitHubSourceFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [rootPath, setRootPath] = useState('/');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    taskCount?: number;
    error?: string;
  } | null>(null);

  // Parse URL when changed
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setValidationResult(null);

    if (newUrl.trim()) {
      const parsed = parseGitHubUrl(newUrl);
      if (parsed) {
        setOwner(parsed.owner || '');
        setRepo(parsed.repo || '');
        setBranch(parsed.branch || 'main');
        setRootPath(parsed.rootPath || '/');

        // Auto-generate name if empty
        if (!name && parsed.owner && parsed.repo) {
          setName(`${parsed.owner}/${parsed.repo}`);
        }
      }
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!token) {
      setError('Token is required to test connection');
      return;
    }

    if (!owner || !repo) {
      setError('Repository URL or owner/repo is required');
      return;
    }

    setValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      // Use Electron IPC if available, otherwise fall back to fetch (for Next.js web)
      const isElectron = typeof window !== 'undefined' && window.api;

      let result;
      if (isElectron) {
        result = await (window as any).api.invoke('github:validate', {
          owner,
          repo,
          branch,
          rootPath,
          token,
        });
      } else {
        const response = await fetch('/api/config/sources/github/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner,
            repo,
            branch,
            rootPath,
            token,
          }),
        });
        result = await response.json();
      }

      setValidationResult(result);

      if (!result.valid) {
        setError(result.error || 'Validation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setValidating(false);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!token) {
      setError('GitHub token is required');
      return;
    }

    if (!owner || !repo) {
      setError('Repository URL or owner/repo is required');
      return;
    }

    setError(null);

    const success = await onSubmit({
      name: name.trim(),
      url: url.trim() || undefined,
      owner,
      repo,
      branch,
      rootPath,
      token,
    });

    if (!success) {
      setError('Failed to add GitHub source');
    }
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My GitHub Tasks"
          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Repository URL */}
      <div>
        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
          Repository URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://github.com/owner/repo/tree/main/tasks"
          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
        />
        <p className="text-[10px] text-slate-600 mt-1">
          Paste a GitHub URL to auto-fill owner, repo, branch, and path
        </p>
      </div>

      {/* Owner / Repo row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
            Owner
          </label>
          <input
            type="text"
            value={owner}
            onChange={(e) => { setOwner(e.target.value); setValidationResult(null); }}
            placeholder="username"
            className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
            Repository
          </label>
          <input
            type="text"
            value={repo}
            onChange={(e) => { setRepo(e.target.value); setValidationResult(null); }}
            placeholder="my-tasks"
            className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>
      </div>

      {/* Branch / Root Path row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
            Branch
          </label>
          <input
            type="text"
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setValidationResult(null); }}
            placeholder="main"
            className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
            Root Path
          </label>
          <input
            type="text"
            value={rootPath}
            onChange={(e) => { setRootPath(e.target.value); setValidationResult(null); }}
            placeholder="/tasks"
            className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>
      </div>

      {/* Token */}
      <div>
        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
          Personal Access Token
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => { setToken(e.target.value); setValidationResult(null); }}
          placeholder="ghp_xxxxxxxxxxxx"
          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
        />
        <p className="text-[10px] text-slate-600 mt-1">
          Token needs <code className="text-cyan-500">repo</code> scope for private repos
        </p>
      </div>

      {/* Validation result */}
      {validationResult && (
        <div className={`p-3 rounded-lg text-sm ${
          validationResult.valid
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {validationResult.valid ? (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Connected! Found {validationResult.taskCount} markdown files</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{validationResult.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && !validationResult && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleTestConnection}
          disabled={validating || !token || (!owner && !url)}
          className="px-3 py-2 bg-slate-800 border border-white/10 text-white text-sm rounded-lg hover:bg-slate-700 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {validating ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !name || !token || !owner || !repo}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-400 hover:to-pink-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding...' : 'Add GitHub Source'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-slate-400 text-sm hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
