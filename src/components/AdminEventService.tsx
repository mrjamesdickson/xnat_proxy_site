import { Activity, Play, Pause } from 'lucide-react';

export function AdminEventService() {
  const events = [
    { name: 'AutoArchive', description: 'Automatically archive sessions after upload', enabled: true, executions: 245 },
    { name: 'DicomAnonymization', description: 'Anonymize DICOM data on session creation', enabled: true, executions: 189 },
    { name: 'EmailNotification', description: 'Send email notifications on project events', enabled: true, executions: 56 },
    { name: 'BackupTrigger', description: 'Trigger backup on data modifications', enabled: false, executions: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Event Service</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Monitor and configure event handlers
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {events.map((event) => (
            <div key={event.name} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`rounded-lg p-3 text-white ${event.enabled ? 'bg-green-500' : 'bg-gray-400'}`}>
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{event.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{event.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Status: {event.enabled ? 'Active' : 'Inactive'}</span>
                      <span>Executions: {event.executions}</span>
                    </div>
                  </div>
                </div>
                <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
                  {event.enabled ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Enable
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
