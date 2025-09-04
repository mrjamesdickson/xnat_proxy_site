import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { XnatApiClient } from '../services/xnat-api';
import type { XnatConfig, XnatUser } from '../services/xnat-api';

interface XnatContextType {
  client: XnatApiClient | null;
  config: XnatConfig | null;
  currentUser: XnatUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (baseURL: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateConfig: (config: Partial<XnatConfig>) => void;
}

const XnatContext = createContext<XnatContextType | null>(null);

interface XnatProviderProps {
  children: ReactNode;
}

const STORAGE_KEYS = {
  CONFIG: 'xnat_config',
  JSESSIONID: 'xnat_jsessionid',
  USER: 'xnat_user',
};

export function XnatProvider({ children }: XnatProviderProps) {
  const [client, setClient] = useState<XnatApiClient | null>(null);
  const [config, setConfig] = useState<XnatConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<XnatUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        const storedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
        const storedJSessionId = localStorage.getItem(STORAGE_KEYS.JSESSIONID);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (storedConfig && storedJSessionId) {
          const parsedConfig: XnatConfig = JSON.parse(storedConfig);
          const configWithSession = {
            ...parsedConfig,
            jsessionid: storedJSessionId,
          };

          const apiClient = new XnatApiClient(configWithSession);
          
          try {
            const isOnline = await apiClient.ping();
            if (isOnline) {
              setClient(apiClient);
              setConfig(configWithSession);
              setIsAuthenticated(true);
              
              if (storedUser) {
                setCurrentUser(JSON.parse(storedUser));
              } else {
                const user = await apiClient.getCurrentUser();
                setCurrentUser(user);
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
              }
            } else {
              clearStoredAuth();
            }
          } catch (error) {
            clearStoredAuth();
          }
        }
      } catch (error) {
        console.error('Failed to initialize from storage:', error);
        clearStoredAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initializeFromStorage();
  }, []);

  const clearStoredAuth = () => {
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    localStorage.removeItem(STORAGE_KEYS.JSESSIONID);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setClient(null);
    setConfig(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const login = async (baseURL: string, username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const loginConfig: XnatConfig = {
        baseURL: baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL,
        username,
        password,
      };

      const tempClient = new XnatApiClient(loginConfig);
      const jsessionid = await tempClient.login(username, password);

      const configWithSession = {
        baseURL: loginConfig.baseURL,
        jsessionid,
      };

      const authenticatedClient = new XnatApiClient(configWithSession);
      const user = await authenticatedClient.getCurrentUser();

      setClient(authenticatedClient);
      setConfig(configWithSession);
      setCurrentUser(user);
      setIsAuthenticated(true);

      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({ baseURL: loginConfig.baseURL }));
      localStorage.setItem(STORAGE_KEYS.JSESSIONID, jsessionid);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      clearStoredAuth();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (client) {
        await client.logout();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      clearStoredAuth();
      setIsLoading(false);
    }
  };

  const updateConfig = (newConfig: Partial<XnatConfig>): void => {
    if (!client || !config) return;

    const updatedConfig = { ...config, ...newConfig };
    client.updateConfig(updatedConfig);
    setConfig(updatedConfig);

    if (newConfig.baseURL) {
      localStorage.setItem(
        STORAGE_KEYS.CONFIG, 
        JSON.stringify({ baseURL: updatedConfig.baseURL })
      );
    }
  };

  const value: XnatContextType = {
    client,
    config,
    currentUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateConfig,
  };

  return (
    <XnatContext.Provider value={value}>
      {children}
    </XnatContext.Provider>
  );
}

export const useXnat = (): XnatContextType => {
  const context = useContext(XnatContext);
  if (!context) {
    throw new Error('useXnat must be used within a XnatProvider');
  }
  return context;
};