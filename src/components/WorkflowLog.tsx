import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw, ArrowLeft, Download, Copy, AlertCircle } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';

export function WorkflowLog() {
  const { workflowId } = useParams();
  const { client } = useXnat();

  const {
    data: logText = '',
    isLoading,
    isError,
    refetch,
    error,
  } = useQuery<string>({
    queryKey: ['workflow-log', workflowId],
    queryFn: () => client?.getWorkflowLog(String(workflowId)) ?? '',
    enabled: Boolean(client) && Boolean(workflowId),
  });

  const lines = useMemo(() => (logText ? logText.split(/\r?\n/) : []), [logText]);

  const handleCopy = () => {
    if (logText) {
      void navigator.clipboard.writeText(logText);
    }
  };

  const handleDownload = () => {
    if (!logText) return;
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `workflow-${workflowId}-log.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <Link
              to={workflowId ? `/processing/workflows/${workflowId}` : '/processing'}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Workflow
            </Link>
            {workflowId && (
              <Link
                to={`/processing/workflows/${workflowId}/build`}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Build Dir
              </Link>
            )}
            <Link
              to="/processing"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Processing Dashboard
            </Link>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Workflow Log</h1>
          {workflowId && (
            <p className="text-sm text-gray-500">Workflow ID: {workflowId}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!logText}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!logText}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-6 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>Unable to load workflow log. {error instanceof Error ? error.message : 'Please try again.'}</span>
        </div>
      ) : !logText ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          No log output is available for this workflow.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-black p-4 shadow-inner">
          <pre className="max-h-[70vh] overflow-auto text-xs leading-5 text-green-300">
{lines.map((line, index) => `${String(index + 1).padStart(4, '0')}: ${line}`).join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}

export default WorkflowLog;
