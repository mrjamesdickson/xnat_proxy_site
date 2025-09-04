import { useState } from 'react';
import { useXnat } from '../contexts/XnatContext';
import { Server, User, Save } from 'lucide-react';

export function Settings() {
  const { config, currentUser, updateConfig } = useXnat();
  const [serverUrl, setServerUrl] = useState(config?.baseURL || '');

  const handleSaveSettings = () => {
    if (serverUrl && serverUrl !== config?.baseURL) {
      updateConfig({ baseURL: serverUrl });
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
    </div>
  );
}