import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Copy, Loader2, RefreshCcw, X, Maximize2, Minimize2 } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatContainer } from '../services/xnat-api';

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
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => valueOrDash(item)).join(', ') : '—';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return String(value);
};

const formatTableValue = (value: unknown): string => {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return value.length > 0 ? value.join(', ') : '[]';
    }
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return String(value);
};

const formatBoolean = (value: unknown): string => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
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

export function WorkflowContainerSummaryModal({ containerId, onClose }: WorkflowContainerSummaryModalProps) {
  const { client } = useXnat();
  const [isExpanded, setIsExpanded] = useState(false);

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

  if (!containerId) {
    return null;
  }

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load container summary. {error instanceof Error ? error.message : 'Please try again.'}</span>
        </div>
      );
    }

    if (!container) {
      return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Container data is unavailable for this workflow.
        </div>
      );
    }

    const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

    const infoTableRows: Array<{ label: string; value: unknown; className?: string }> = [
      { label: 'id', value: extractField(container, ['id']) },
      { label: 'command-id', value: extractField(container, ['command-id']) },
      { label: 'status', value: extractField(container, ['status']) },
      { label: 'status-time', value: extractField(container, ['status-time']) },
      { label: 'wrapper-id', value: extractField(container, ['wrapper-id']) },
      { label: 'container-id', value: extractField(container, ['container-id']) },
      { label: 'workflow-id', value: extractField(container, ['workflow-id']) },
      { label: 'user-id', value: extractField(container, ['user-id', 'user']) },
      { label: 'project', value: extractField(container, ['project', 'project-id']) },
      { label: 'backend', value: extractField(container, ['backend']) },
      { label: 'service-id', value: extractField(container, ['service-id']) },
      { label: 'task-id', value: extractField(container, ['task-id']) },
      { label: 'node-id', value: extractField(container, ['node-id']) },
      { label: 'docker-image', value: extractField(container, ['docker-image']) },
      {
        label: 'command-line',
        value: extractField(container, ['command-line', 'command']),
        className: 'font-mono whitespace-pre-wrap break-words',
      },
      { label: 'override-entrypoint', value: extractField(container, ['override-entrypoint']) },
      { label: 'subtype', value: extractField(container, ['subtype']) },
      { label: 'env', value: extractField(container, ['env', 'environment-variables']) },
      { label: 'ports', value: extractField(container, ['ports']) },
      { label: 'log-paths', value: extractField(container, ['log-paths']) },
      { label: 'swarm-constraints', value: extractField(container, ['swarm-constraints']) },
      { label: 'auto-remove', value: extractField(container, ['auto-remove']) },
      { label: 'container-labels', value: extractField(container, ['container-labels']) },
      { label: 'secrets', value: extractField(container, ['secrets']) },
      { label: 'swarm', value: extractField(container, ['swarm']) },
    ];

    const mounts = ensureArray(extractField(container, ['mounts']));
    const inputs = ensureArray(extractField(container, ['inputs', 'resolved-inputs']));
    const outputs = ensureArray(extractField(container, ['outputs', 'resolved-outputs']));
    const history = ensureArray(extractField(container, ['history']));

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Container information</h3>
          <div className="mt-2 overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-xs sm:text-sm">
              <tbody className="divide-y divide-gray-200">
                {infoTableRows.map((row) => {
                  const displayValue = formatTableValue(row.value);
                  return (
                    <tr key={row.label} className="odd:bg-white even:bg-gray-50">
                      <th className="w-40 whitespace-nowrap px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-gray-600 sm:w-56 sm:text-xs">
                        {row.label}
                      </th>
                      <td className={`px-3 py-2 text-gray-900 ${row.className ?? 'whitespace-pre-wrap break-words'}`}>
                        {displayValue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {mounts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Container Mounts</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Name</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Container Path</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Host Path</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Writable</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Input Files</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Output Files</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mounts.map((mount, idx) => {
                    const inputFiles = Array.isArray((mount as Record<string, unknown>)['input-files'])
                      ? ((mount as Record<string, unknown>)['input-files'] as Array<{ name?: string }>)
                          .map((file) => file?.name)
                          .filter((name): name is string => Boolean(name))
                      : [];
                    const outputFiles = Array.isArray((mount as Record<string, unknown>)['output-files'])
                      ? ((mount as Record<string, unknown>)['output-files'] as Array<{ name?: string }>)
                          .map((file) => file?.name)
                          .filter((name): name is string => Boolean(name))
                      : [];
                    const key = (mount as Record<string, unknown>).id ?? (mount as Record<string, unknown>).name ?? idx;
                    return (
                      <tr key={String(key)} className="bg-white">
                        <td className="px-3 py-2 align-top text-gray-900">{valueOrDash((mount as Record<string, unknown>).name)}</td>
                        <td className="px-3 py-2 align-top font-mono text-gray-800">{valueOrDash((mount as Record<string, unknown>)['container-path'])}</td>
                        <td className="px-3 py-2 align-top font-mono text-gray-800">{valueOrDash((mount as Record<string, unknown>)['xnat-host-path'] ?? (mount as Record<string, unknown>)['container-host-path'])}</td>
                        <td className="px-3 py-2 align-top text-gray-900">{formatBoolean((mount as Record<string, unknown>).writable)}</td>
                        <td className="px-3 py-2 align-top text-gray-800">{inputFiles.length > 0 ? inputFiles.join(', ') : '—'}</td>
                        <td className="px-3 py-2 align-top text-gray-800">{outputFiles.length > 0 ? outputFiles.join(', ') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {inputs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Container Inputs</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Name</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Type</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Value</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Sensitive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inputs.map((input, idx) => {
                    const row = input as Record<string, unknown>;
                    const key = row.id ?? `${row.name ?? 'input'}-${idx}`;
                    return (
                      <tr key={String(key)} className="bg-white">
                        <td className="px-3 py-2 align-top text-gray-900">{valueOrDash(row.name)}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{valueOrDash(row.type)}</td>
                        <td className="px-3 py-2 align-top font-mono text-gray-800">{valueOrDash(row.value)}</td>
                        <td className="px-3 py-2 align-top text-gray-900">{formatBoolean(row.sensitive)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {outputs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Container Outputs</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Name</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Type</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Mount</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Label</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Required</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Source</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Handled By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {outputs.map((output, idx) => {
                    const row = output as Record<string, unknown>;
                    const key = row.id ?? `${row.name ?? 'output'}-${idx}`;
                    const source = [row['from-command-output'], row['from-output-handler']]
                      .map((item) => valueOrDash(item))
                      .filter((item) => item !== '—')
                      .join(' • ');
                    return (
                      <tr key={String(key)} className="bg-white">
                        <td className="px-3 py-2 align-top text-gray-900">{valueOrDash(row.name)}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{valueOrDash(row.type)}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{valueOrDash(row.mount)}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{valueOrDash(row.label)}</td>
                        <td className="px-3 py-2 align-top text-gray-900">{formatBoolean(row.required)}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{source.length > 0 ? source : '—'}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{valueOrDash(row['handled-by'])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Container History</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Status</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Entity</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Recorded</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">External</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Message</th>
                    <th className="px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">Exit Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((item, idx) => {
                    const row = item as Record<string, unknown>;
                    const key = row.id ?? `${row.status ?? 'history'}-${idx}`;
                    const entity = [row['entity-type'], row['entity-id']]
                      .map((entry) => valueOrDash(entry))
                      .filter((entry) => entry !== '—')
                      .join(' • ');
                    const exitCode = valueOrDash(row['exit-code'] ?? row.exitCode);
                    return (
                      <tr key={String(key)} className="bg-white">
                        <td className="px-3 py-2 align-top text-gray-900">{valueOrDash(row.status)}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{entity.length > 0 ? entity : '—'}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{formatDateTime(row['time-recorded'])}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{formatDateTime(row['external-timestamp'])}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{valueOrDash(row.message)}</td>
                        <td className="px-3 py-2 align-top text-gray-700">{exitCode}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
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
            onClick={onClose}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <X className="mr-2 h-3.5 w-3.5" />
            Close
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4">
      <div
        className={
          isExpanded
            ? 'relative flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl'
            : 'relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl'
        }
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Container Execution Summary</h2>
            <p className="text-xs text-gray-500">Container ID: {containerId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-800"
              aria-label={isExpanded ? 'Restore summary size' : 'Maximize summary'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{renderBody()}</div>
      </div>
    </div>
 );
}

export interface WorkflowContainerRawModalProps {
  container: XnatContainer | null;
  open: boolean;
  onClose: () => void;
}

export function WorkflowContainerRawModal({ container, open, onClose }: WorkflowContainerRawModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Raw Container Payload</h2>
            <p className="text-xs text-gray-500">JSON snapshot of the container record.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!container) return;
                void navigator.clipboard.writeText(JSON.stringify(container, null, 2));
              }}
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
              aria-label="Close raw payload"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-950 p-4">
          <pre className="text-xs leading-5 text-green-300">
            {container ? JSON.stringify(container, null, 2) : 'Container data unavailable.'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default WorkflowContainerSummaryModal;
