import { useState, useEffect } from 'react';
import { ThemeModule } from '../types/theme';
import { themeManager } from '../services/ThemeManager';

/**
 * Hook for managing theme loading and switching
 * Handles theme lifecycle and provides current theme state
 */
export const useTheme = (themeId: string) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTheme = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const theme = await themeManager.loadTheme(themeId);
        if (!cancelled) {
          setCurrentTheme(theme);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          console.error('Error loading theme:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTheme();

    return () => {
      cancelled = true;
    };
  }, [themeId]);

  return { currentTheme, isLoading, error };
};
