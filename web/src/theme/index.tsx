/**
 * Theme compatibility layer.
 *
 * Wraps HeroUI's useTheme to provide the legacy { isDark, toggleTheme }
 * interface used by existing components (e.g., Layout.tsx).
 *
 * HeroUI manages light/dark/system directly via document.documentElement.
 * Storage key: 'heroui-theme'.
 */
import { useTheme as useHeroUITheme } from '@heroui/react';
import { useCallback, useMemo } from 'react';

export function useTheme() {
  const { resolvedTheme, setTheme, theme } = useHeroUITheme();

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return useMemo(() => ({ isDark, toggleTheme, theme, setTheme }), [isDark, toggleTheme, theme, setTheme]);
}
