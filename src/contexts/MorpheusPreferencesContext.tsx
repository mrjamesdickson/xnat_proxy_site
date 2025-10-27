import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useXnat } from './XnatContext';
import type { ThemeMode } from './theme-types';

export type LayoutMode = 'grid' | 'table';

export type PageType = 'projects' | 'subjects' | 'experiments' | 'prearchive' | 'processing';

interface MorpheusPreferences {
  theme?: ThemeMode;
  layouts?: {
    [key in PageType]?: LayoutMode;
  };
  // Add more preferences here as needed
}

interface MorpheusPreferencesContextValue {
  preferences: MorpheusPreferences;
  isLoading: boolean;
  updatePreferences: (updates: Partial<MorpheusPreferences>) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLayout: (page: PageType, layout: LayoutMode) => Promise<void>;
  getLayout: (page: PageType) => LayoutMode;
}

const MorpheusPreferencesContext = createContext<MorpheusPreferencesContextValue | undefined>(undefined);

const MORPHEUS_VERSION = '1.0';

const DEFAULT_PREFERENCES: MorpheusPreferences = {
  theme: 'light',
  layouts: {
    projects: 'grid',
    subjects: 'table',
    experiments: 'table',
    prearchive: 'table',
    processing: 'table',
  },
};

interface UserStorageApps {
  [appName: string]: {
    version: string;
    preferences: Record<string, unknown>;
  };
}

interface UserStorage {
  apps?: UserStorageApps;
  [key: string]: unknown;
}

interface MorpheusPreferencesProviderProps {
  children: ReactNode;
}

export function MorpheusPreferencesProvider({ children }: MorpheusPreferencesProviderProps) {
  const { client, isAuthenticated } = useXnat();
  const [preferences, setPreferences] = useState<MorpheusPreferences>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from XNAT on mount
  useEffect(() => {
    if (!isAuthenticated || !client) {
      setIsLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const storage = await client.getUserStorage() as UserStorage;
        const morpheusData = storage?.apps?.morpheus?.preferences;

        if (morpheusData && typeof morpheusData === 'object') {
          setPreferences(morpheusData as MorpheusPreferences);
        } else {
          // First time loading - initialize with defaults
          setPreferences(DEFAULT_PREFERENCES);

          // Save defaults to XNAT storage
          if (!storage.apps) {
            storage.apps = {};
          }
          storage.apps.morpheus = {
            version: MORPHEUS_VERSION,
            preferences: DEFAULT_PREFERENCES as Record<string, unknown>
          };
          await client.setUserStorage(storage);
        }
      } catch (error) {
        console.error('Failed to load Morpheus preferences:', error);
        // Fall back to defaults even on error
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [isAuthenticated, client]);

  const updatePreferences = useCallback(
    async (updates: Partial<MorpheusPreferences>) => {
      if (!client) {
        console.warn('Cannot update preferences: not authenticated');
        return;
      }

      const newPreferences = { ...preferences, ...updates };
      setPreferences(newPreferences);

      try {
        // Get current storage, update morpheus section, and save
        const storage = await client.getUserStorage() as UserStorage;

        // Ensure apps object exists
        if (!storage.apps) {
          storage.apps = {};
        }

        // Ensure morpheus app entry exists with version
        if (!storage.apps.morpheus) {
          storage.apps.morpheus = {
            version: MORPHEUS_VERSION,
            preferences: {}
          };
        }

        // Update morpheus preferences
        storage.apps.morpheus.preferences = newPreferences as Record<string, unknown>;

        await client.setUserStorage(storage);
      } catch (error) {
        console.error('Failed to save Morpheus preferences:', error);
        // Revert on error
        setPreferences(preferences);
        throw error;
      }
    },
    [client, preferences]
  );

  const setTheme = useCallback(
    async (theme: ThemeMode) => {
      await updatePreferences({ theme });
    },
    [updatePreferences]
  );

  const setLayout = useCallback(
    async (page: PageType, layout: LayoutMode) => {
      const currentLayouts = preferences.layouts || {};
      await updatePreferences({
        layouts: {
          ...currentLayouts,
          [page]: layout
        }
      });
    },
    [updatePreferences, preferences.layouts]
  );

  const getLayout = useCallback(
    (page: PageType): LayoutMode => {
      return preferences.layouts?.[page] || 'table';
    },
    [preferences.layouts]
  );

  const value = useMemo<MorpheusPreferencesContextValue>(
    () => ({
      preferences,
      isLoading,
      updatePreferences,
      setTheme,
      setLayout,
      getLayout,
    }),
    [preferences, isLoading, updatePreferences, setTheme, setLayout, getLayout]
  );

  return (
    <MorpheusPreferencesContext.Provider value={value}>
      {children}
    </MorpheusPreferencesContext.Provider>
  );
}

export function useMorpheusPreferences() {
  const context = useContext(MorpheusPreferencesContext);
  if (!context) {
    throw new Error('useMorpheusPreferences must be used within a MorpheusPreferencesProvider');
  }
  return context;
}
