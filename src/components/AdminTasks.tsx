import { Server, Clock, CheckCircle } from 'lucide-react';

export function AdminTasks() {
  const tasks = [
    { name: 'Session Cleanup', schedule: 'Daily at 2:00 AM', lastRun: '2 hours ago', status: 'completed' },
    { name: 'Email Digest', schedule: 'Weekly on Monday', lastRun: '2 days ago', status: 'completed' },
    { name: 'Archive Backup', schedule: 'Daily at 3:00 AM', lastRun: '1 hour ago', status: 'completed' },
    { name: 'Report Generation', schedule: 'Monthly on 1st', lastRun: '15 days ago', status: 'completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">XNAT Task Settings</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage scheduled tasks and automation
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {tasks.map((task) => (
            <div key={task.name} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="rounded-lg bg-indigo-500 p-3 text-white">
                    <Server className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{task.name}</h3>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        {task.schedule}
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="mr-1 h-4 w-4 text-green-500" />
                        Last run: {task.lastRun}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
                    Edit Schedule
                  </button>
                  <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">
                    Run Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
