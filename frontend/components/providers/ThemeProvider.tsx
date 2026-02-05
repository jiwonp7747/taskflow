'use client';

import { useEffect } from 'react';
import { useConfig } from '@/hooks/useConfig';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config } = useConfig();

  useEffect(() => {
    // Apply theme to document
    const theme = config.theme === 'dark' ? 'cyberpunk' : 'soft';
    document.documentElement.setAttribute('data-theme', theme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', config.theme === 'dark' ? '#050508' : '#F8F6F3');
    }
  }, [config.theme]);

  return <>{children}</>;
}
