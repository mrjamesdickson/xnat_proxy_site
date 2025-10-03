import { FileImage, Database, Code } from 'lucide-react';

export function AdminDataTypes() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Data Types</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage data type definitions and schemas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-blue-500 p-3 text-white">
              <FileImage className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Image Session</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">xnat:imageSessionData</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-green-500 p-3 text-white">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">MR Session</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">xnat:mrSessionData</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-purple-500 p-3 text-white">
              <Code className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">CT Session</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">xnat:ctSessionData</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Custom Data Types</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define custom data type schemas for your XNAT instance
        </p>
        <div className="mt-4">
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
            Create Custom Data Type
          </button>
        </div>
      </div>
    </div>
  );
}
