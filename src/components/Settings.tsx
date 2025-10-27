import { useState } from 'react';
import { useXnat } from '../contexts/XnatContext';
import { useMorpheusPreferences, type LayoutMode, type PageType } from '../contexts/MorpheusPreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { Server, User, Save, Palette, Code, X } from 'lucide-react';
import { THEME_OPTIONS, type ThemeMode } from '../contexts/theme-types';

const themeLabels: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  ocean: 'Ocean Breeze',
  forest: 'Forest Canopy',
  midnight: 'Midnight Glow',
};

const pageLabels: Record<PageType, string> = {
  projects: 'Projects',
  subjects: 'Subjects',
  experiments: 'Experiments',
  prearchive: 'Prearchive',
  processing: 'Processing',
};

export function Settings() {
  const { config, currentUser, updateConfig } = useXnat();
  const { preferences, isLoading: prefsLoading, setLayout, getLayout } = useMorpheusPreferences();
  const { theme, setTheme } = useTheme();
  const [serverUrl, setServerUrl] = useState(config?.baseURL || '');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [showJsonPopup, setShowJsonPopup] = useState(false);

  const handleSaveSettings = () => {
    if (serverUrl && serverUrl !== config?.baseURL) {
      updateConfig({ baseURL: serverUrl });
    }
  };

  const handleThemeChange = async (newTheme: ThemeMode) => {
    try {
      setSaveStatus('Saving...');
      setTheme(newTheme);
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Failed to save theme:', error);
      setSaveStatus('Failed to save');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleLayoutChange = async (page: PageType, layout: LayoutMode) => {
    try {
      setSaveStatus('Saving...');
      await setLayout(page, layout);
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Failed to save layout:', error);
      setSaveStatus('Failed to save');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your XNAT connection and user preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Server Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <Server className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Server Configuration</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="server-url" className="block text-sm font-medium text-gray-700">
                XNAT Server URL
              </label>
              <input
                type="url"
                id="server-url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="https://your-xnat-server.com"
              />
            </div>
            
            <button
              onClick={handleSaveSettings}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>

        {/* Morpheus Preferences */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Palette className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Morpheus Preferences</h3>
            </div>
            {saveStatus && (
              <span className={`text-sm ${saveStatus.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                {saveStatus}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {prefsLoading ? (
              <div className="text-sm text-gray-500">Loading preferences...</div>
            ) : (
              <>
                <div>
                  <label htmlFor="theme-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    id="theme-select"
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {THEME_OPTIONS.map((themeOption) => (
                      <option key={themeOption} value={themeOption}>
                        {themeLabels[themeOption]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Your theme preference is saved to your XNAT account and syncs across sessions.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Page Layouts
                  </label>
                  <div className="space-y-3">
                    {(['projects', 'subjects', 'experiments', 'prearchive', 'processing'] as PageType[]).map((page) => (
                      <div key={page} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{pageLabels[page]}</span>
                        <select
                          value={getLayout(page)}
                          onChange={(e) => handleLayoutChange(page, e.target.value as LayoutMode)}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="table">Table</option>
                          <option value="grid">Grid</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Choose how you want to view data on each page. Changes are saved automatically.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowJsonPopup(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    View Raw Preferences
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* User Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">User Information</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <div className="mt-1 text-sm text-gray-900">{currentUser?.login}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 text-sm text-gray-900">{currentUser?.email}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <div className="mt-1 text-sm text-gray-900">{currentUser?.firstname}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <div className="mt-1 text-sm text-gray-900">{currentUser?.lastname}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Popup Modal */}
      {showJsonPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Raw Preferences Data</h3>
              <button
                onClick={() => setShowJsonPopup(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(preferences, null, 2)}
                </pre>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Storage location: <code className="bg-gray-100 px-1.5 py-0.5 rounded">apps.morpheus.preferences</code>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Version: <code className="bg-gray-100 px-1.5 py-0.5 rounded">1.0</code>
              </p>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setShowJsonPopup(false)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}