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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme && AVAILABLE_THEMES.includes(storedTheme as ThemeMode)) {
      setThemeState(storedTheme as ThemeMode);
      return;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
    }
  }, []);

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
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((previous) => {
      const currentIndex = THEME_SEQUENCE.indexOf(previous);
      const nextIndex = (currentIndex + 1) % THEME_SEQUENCE.length;
      return THEME_SEQUENCE[nextIndex];
    });
  }, []);

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

