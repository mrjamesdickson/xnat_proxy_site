import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Copy, Loader2, RefreshCcw, X, FileText } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatContainer } from '../services/xnat-api';
import { WorkflowContainerLogsModal } from './WorkflowContainerLogs';

interface WorkflowContainerSummaryModalProps {
  containerId: string | null;
  onClose: () => void;
}

const valueOrDash = (value: unknown): string => {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '—';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
};

const formatDateTime = (value: unknown): string => {
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const date = new Date(numeric);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString();
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return '—';
};

const extractField = (container: XnatContainer | null, keys: string[]): unknown => {
  if (!container) return undefined;
  const record = container as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
  }
  return undefined;
};

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => valueOrDash(item));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => `${key}: ${valueOrDash(val)}`,
    );
  }
  return value ? [valueOrDash(value)] : [];
};

export function WorkflowContainerSummaryModal({ containerId, onClose }: WorkflowContainerSummaryModalProps) {
  const { client } = useXnat();
  const [showStdout, setShowStdout] = useState(false);
  const [showStderr, setShowStderr] = useState(false);

  const {
    data: container = null,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<XnatContainer | null>({
    queryKey: ['container-summary', containerId],
    queryFn: () => (client && containerId ? client.getContainer(containerId) : Promise.resolve(null)),
    enabled: Boolean(client) && Boolean(containerId),
  });

  useEffect(() => {
    if (!containerId) return undefined;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [containerId, onClose]);

  const handleCopyJson = () => {
    if (container) {
      void navigator.clipboard.writeText(JSON.stringify(container, null, 2));
    }
  };

  if (!containerId) {
    return null;
  }

  const summaryFields = [
    { label: 'Status', value: extractField(container, ['status']) },
    { label: 'Wrapper', value: extractField(container, ['wrapper-name']) },
    { label: 'Command', value: extractField(container, ['command-line', 'command']) },
    { label: 'Image', value: extractField(container, ['docker-image']) },
    { label: 'User', value: extractField(container, ['user-id', 'user']) },
    { label: 'Project', value: extractField(container, ['project-id', 'project']) },
    { label: 'Created', value: formatDateTime(extractField(container, ['create-time', 'created'])) },
    { label: 'Last Status', value: formatDateTime(extractField(container, ['status-time'])) },
    { label: 'Compute Environment', value: extractField(container, ['compute-environment']) },
    { label: 'Job ID', value: extractField(container, ['job-id']) },
  ];

  const mounts = toList(extractField(container, ['mounts']));
  const inputs = toList(extractField(container, ['inputs', 'resolved-inputs']));
  const outputs = toList(extractField(container, ['outputs', 'resolved-outputs']));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Container Execution Summary</h2>
            <p className="text-xs text-gray-500">Container ID: {containerId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="mr-2 h-3.5 w-3.5" />}
              Refresh
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              disabled={!container}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close container summary"
            >
              <X className="h-4 w-4" />
           </button>
         </div>
       </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-8 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load container summary. {error instanceof Error ? error.message : 'Please try again.'}</span>
            </div>
          ) : !container ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              Container data is unavailable for this workflow.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {summaryFields.map((field) => (
                  <div key={field.label} className="rounded-md border border-gray-100 bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{field.label}</div>
                    <div className="mt-1 text-sm text-gray-900 break-words">{valueOrDash(field.value)}</div>
                  </div>
                ))}
              </div>

              {mounts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Mounts</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {mounts.map((mount) => (
                      <li key={mount} className="rounded bg-gray-50 px-3 py-1">{mount}</li>
                    ))}
                  </ul>
                </div>
              )}

              {inputs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Inputs</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {inputs.map((input) => (
                      <li key={input} className="rounded bg-gray-50 px-3 py-1">{input}</li>
                    ))}
                  </ul>
                </div>
              )}

              {outputs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Outputs</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {outputs.map((output) => (
                      <li key={output} className="rounded bg-gray-50 px-3 py-1">{output}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowStdout(true)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  View StdOut.log
                </button>
                <button
                  type="button"
                  onClick={() => setShowStderr(true)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  View StdErr.log
                </button>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Raw Container Payload</h3>
                <div className="overflow-x-auto rounded-md border border-gray-100 bg-gray-50 p-4 text-xs text-gray-700">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(container, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <WorkflowContainerLogsModal
        containerId={showStdout ? containerId : null}
        logType="stdout"
        onClose={() => setShowStdout(false)}
      />
      <WorkflowContainerLogsModal
        containerId={showStderr ? containerId : null}
        logType="stderr"
        onClose={() => setShowStderr(false)}
      />
    </div>
 );
}

export default WorkflowContainerSummaryModal;
