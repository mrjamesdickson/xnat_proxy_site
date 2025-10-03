import { Settings, CheckCircle, XCircle, Package } from 'lucide-react';

export function AdminPlugins() {
  const plugins = [
    { name: 'Container Service', version: '3.2.0', enabled: true, description: 'Docker container execution service' },
    { name: 'OHIF Viewer', version: '3.0.1', enabled: true, description: 'Web-based DICOM viewer' },
    { name: 'DICOM Browser', version: '1.8.0', enabled: true, description: 'Browse and query DICOM studies' },
    { name: 'Batch Launch', version: '1.0.2', enabled: false, description: 'Batch processing workflows' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Plugin Settings</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure and manage XNAT plugins
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {plugins.map((plugin) => (
            <div key={plugin.name} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="rounded-lg bg-blue-500 p-3 text-white">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{plugin.name}</h3>
                      {plugin.enabled ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                          <XCircle className="mr-1 h-3 w-3" />
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{plugin.description}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Version {plugin.version}</p>
                  </div>
                </div>
                <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
