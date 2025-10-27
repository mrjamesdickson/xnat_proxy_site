import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { THEME_OPTIONS, type ThemeMode } from './theme-types';
import { useMorpheusPreferences } from './MorpheusPreferencesContext';

const AVAILABLE_THEMES: ThemeMode[] = [...THEME_OPTIONS];

const THEME_CLASS_MAP: Record<ThemeMode, string[]> = {
  light: [],
  dark: ['dark'],
  ocean: ['theme-ocean'],
  forest: ['theme-forest'],
  midnight: ['dark', 'theme-midnight'],
};

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'xnat-theme';
const ALL_THEME_CLASSES = Array.from(new Set(Object.values(THEME_CLASS_MAP).flat()));
const THEME_SEQUENCE: ThemeMode[] = [...AVAILABLE_THEMES];

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const { preferences, isLoading, setTheme: setMorpheusTheme } = useMorpheusPreferences();

  // Load theme from morpheus preferences or localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) {
      return;
    }

    // Priority 1: Morpheus preferences (XNAT user storage)
    if (preferences.theme && AVAILABLE_THEMES.includes(preferences.theme)) {
      setThemeState(preferences.theme);
      // Sync to localStorage
      window.localStorage.setItem(STORAGE_KEY, preferences.theme);
      return;
    }

    // Priority 2: localStorage (fallback when not authenticated or no preference set)
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme && AVAILABLE_THEMES.includes(storedTheme as ThemeMode)) {
      setThemeState(storedTheme as ThemeMode);
      return;
    }

    // Priority 3: System preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
    }
  }, [preferences, isLoading]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    if (ALL_THEME_CLASSES.length) {
      root.classList.remove(...ALL_THEME_CLASSES);
    }

    const classesToAdd = THEME_CLASS_MAP[theme];
    if (classesToAdd.length) {
      root.classList.add(...classesToAdd);
    }

    root.setAttribute('data-theme', theme);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    if (AVAILABLE_THEMES.includes(nextTheme)) {
      setThemeState(nextTheme);
      // Save to Morpheus preferences (XNAT user storage)
      setMorpheusTheme(nextTheme).catch((error) => {
        console.error('Failed to save theme to XNAT:', error);
      });
    }
  }, [setMorpheusTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((previous) => {
      const currentIndex = THEME_SEQUENCE.indexOf(previous);
      const nextIndex = (currentIndex + 1) % THEME_SEQUENCE.length;
      const nextTheme = THEME_SEQUENCE[nextIndex];

      // Save to Morpheus preferences (XNAT user storage)
      setMorpheusTheme(nextTheme).catch((error) => {
        console.error('Failed to save theme to XNAT:', error);
      });

      return nextTheme;
    });
  }, [setMorpheusTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

