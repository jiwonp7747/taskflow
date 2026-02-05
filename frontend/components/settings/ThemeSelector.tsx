'use client';

import { useState } from 'react';

interface ThemeSelectorProps {
  currentTheme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => Promise<boolean>;
}

const themes = [
  {
    id: 'dark' as const,
    name: 'Cyberpunk',
    description: 'Dark neon terminal aesthetic',
    preview: {
      bg: '#050508',
      accent: '#00f0ff',
      text: '#e2e8f0',
    },
  },
  {
    id: 'light' as const,
    name: 'Soft',
    description: 'Calm pastel minimalism',
    preview: {
      bg: '#F8F6F3',
      accent: '#B8A9C9',
      text: '#2d2d2d',
    },
  },
];

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleThemeChange = async (theme: 'dark' | 'light') => {
    if (theme === currentTheme || isChanging) return;

    setIsChanging(true);
    try {
      await onThemeChange(theme);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">Theme</h3>
        <p className="text-xs text-[var(--soft-text-muted,#64748b)]">
          Choose your preferred appearance
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            disabled={isChanging}
            className={`
              relative p-3 rounded-xl border-2 transition-all duration-200
              ${currentTheme === theme.id
                ? 'border-[var(--neon-violet)] bg-[var(--neon-violet)]/10'
                : 'border-[var(--glass-border)] hover:border-[var(--neon-violet)]/50 bg-[var(--glass-bg)]'
              }
              ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Theme Preview */}
            <div
              className="w-full h-16 rounded-lg mb-3 overflow-hidden border"
              style={{
                backgroundColor: theme.preview.bg,
                borderColor: theme.preview.accent + '40',
              }}
            >
              {/* Mini preview content */}
              <div className="p-2 h-full flex flex-col gap-1">
                <div
                  className="h-2 w-8 rounded"
                  style={{ backgroundColor: theme.preview.accent }}
                />
                <div
                  className="h-1.5 w-12 rounded opacity-50"
                  style={{ backgroundColor: theme.preview.text }}
                />
                <div
                  className="h-1.5 w-10 rounded opacity-30"
                  style={{ backgroundColor: theme.preview.text }}
                />
              </div>
            </div>

            {/* Theme Info */}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {theme.name}
                </span>
                {currentTheme === theme.id && (
                  <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--neon-violet)]/20 text-[var(--neon-violet)]">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--soft-text-muted,#64748b)] mt-0.5">
                {theme.description}
              </p>
            </div>

            {/* Selection indicator */}
            {currentTheme === theme.id && (
              <div className="absolute top-2 right-2">
                <svg
                  className="w-5 h-5 text-[var(--neon-violet)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {isChanging && (
        <div className="text-xs text-center text-[var(--soft-text-muted,#64748b)]">
          Applying theme...
        </div>
      )}
    </div>
  );
}
