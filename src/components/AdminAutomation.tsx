import { Code, Play, FileText, Plus } from 'lucide-react';

export function AdminAutomation() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Automation Scripts</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure automation scripts and workflows
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-700">
          <button className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
            <Plus className="mr-2 h-4 w-4" />
            Add New Script
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-green-500 p-2 text-white">
                    <Code className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      Auto Archive Script
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Automatically archives sessions after upload
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <FileText className="mr-1 h-3 w-3" />
                        Python
                      </span>
                      <span>Last run: 2 hours ago</span>
                    </div>
                  </div>
                </div>
                <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
                  <Play className="mr-1 h-3 w-3" />
                  Run
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-blue-500 p-2 text-white">
                    <Code className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      DICOM Anonymization
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Anonymizes DICOM headers on upload
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <FileText className="mr-1 h-3 w-3" />
                        Shell Script
                      </span>
                      <span>Last run: 1 day ago</span>
                    </div>
                  </div>
                </div>
                <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
                  <Play className="mr-1 h-3 w-3" />
                  Run
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
