import { Search, Trash2, Edit, Plus } from 'lucide-react';

export function AdminStoredSearches() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Stored Searches</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage saved search queries
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-700">
          <button className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
            <Plus className="mr-2 h-4 w-4" />
            Create Saved Search
          </button>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Recent MR Sessions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  All MR sessions from the last 30 days
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
                <Edit className="h-4 w-4" />
              </button>
              <button className="rounded-md border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:hover:bg-red-900/20">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Incomplete Sessions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sessions with missing scan data
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
                <Edit className="h-4 w-4" />
              </button>
              <button className="rounded-md border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:hover:bg-red-900/20">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
