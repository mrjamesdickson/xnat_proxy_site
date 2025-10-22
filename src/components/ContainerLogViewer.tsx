import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  AlertCircle,
  Download,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';

export interface ContainerLogViewerProps {
  containerId: string | null;
  onClose: () => void;
}

export function ContainerLogViewer({ containerId, onClose }: ContainerLogViewerProps) {
  const { client } = useXnat();
  const [logType, setLogType] = useState<'stdout' | 'stderr'>('stdout');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const logsQuery = useQuery({
    queryKey: ['container-logs', containerId, logType],
    enabled: !!client && !!containerId,
    queryFn: () =>
      containerId ? client?.getContainerLogs(containerId, logType) : Promise.resolve({ content: '', timestamp: null }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logsQuery.data?.content, autoScroll]);

  if (!containerId) return null;

  const handleDownload = () => {
    const logs = logsQuery.data?.content || '';
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `container-${containerId}-${logType}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Container Logs</h2>
              <p className="text-sm text-gray-500">Container ID: {containerId}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLogType('stdout')}
                  className={clsx(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    logType === 'stdout'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  Standard Output
                </button>
                <button
                  type="button"
                  onClick={() => setLogType('stderr')}
                  className={clsx(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    logType === 'stderr'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  Standard Error
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-scroll</span>
                </label>

                <button
                  type="button"
                  onClick={() => logsQuery.refetch()}
                  disabled={logsQuery.isFetching}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={clsx('h-4 w-4', { 'animate-spin': logsQuery.isFetching })} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!logsQuery.data?.content}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {logsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">Loading logs...</p>
                </div>
              </div>
            ) : logsQuery.isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Unable to load logs.</span>
                </div>
                <p className="mt-2">
                  {logsQuery.error instanceof Error ? logsQuery.error.message : 'Please try again.'}
                </p>
              </div>
            ) : !logsQuery.data?.content ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center text-sm text-gray-600">
                <p>No logs available for this container.</p>
              </div>
            ) : (
              <div
                ref={logContainerRef}
                className="rounded-md bg-gray-900 p-4 font-mono text-sm text-green-400 overflow-auto"
                style={{ maxHeight: '60vh' }}
              >
                <pre className="whitespace-pre-wrap break-words">
                  {logsQuery.data.content}
                </pre>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContainerLogViewer;
