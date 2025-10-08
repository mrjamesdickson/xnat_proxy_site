import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, RefreshCcw, X } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatContainerLogResponse } from '../services/xnat-api';

interface WorkflowContainerLogsModalProps {
  containerId: string | null;
  logType: 'stdout' | 'stderr';
  onClose: () => void;
}

export function WorkflowContainerLogsModal({ containerId, logType, onClose }: WorkflowContainerLogsModalProps) {
  const { client } = useXnat();
  const [logText, setLogText] = useState('');
  const lastTimestampRef = useRef<string | null>(null);

  const {
    data: logChunk,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<XnatContainerLogResponse>({
    queryKey: ['container-log', containerId, logType],
    queryFn: () => (
      client && containerId
        ? client.getContainerLogs(containerId, logType, { since: lastTimestampRef.current ?? '-1' })
        : Promise.resolve<XnatContainerLogResponse>({ content: '', timestamp: null })
    ),
    enabled: Boolean(client) && Boolean(containerId),
    refetchOnWindowFocus: false,
    refetchInterval: containerId ? 5000 : false,
    refetchIntervalInBackground: Boolean(containerId),
  });

  useEffect(() => {
    setLogText('');
    lastTimestampRef.current = null;
  }, [containerId, logType]);

  useEffect(() => {
    if (!logChunk) return;

    const content = typeof logChunk.content === 'string' ? logChunk.content : '';
    const timestamp = logChunk.timestamp ?? null;
    const previousTimestamp = lastTimestampRef.current;

    if (!previousTimestamp || previousTimestamp === '-1') {
      setLogText(content);
    } else if (content) {
      setLogText((prev) => {
        if (!prev) return content;
        const needsNewline = !prev.endsWith('\n') && !content.startsWith('\n');
        return `${prev}${needsNewline ? '\n' : ''}${content}`;
      });
    }

    if (timestamp !== undefined && timestamp !== null) {
      lastTimestampRef.current = timestamp;
    } else if (previousTimestamp === null) {
      lastTimestampRef.current = '-1';
    }
  }, [logChunk]);

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

  const title = logType === 'stdout' ? 'Stdout Log' : 'Stderr Log';

  if (!containerId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500">Container ID: {containerId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { void refetch(); }}
              disabled={isFetching}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFetching ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="mr-2 h-3.5 w-3.5" />}
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close container log"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="h-6 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>Unable to load container log. {error instanceof Error ? error.message : 'Please try again.'}</span>
            </div>
          ) : logText.trim().length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              No log output available.
            </div>
          ) : (
            <pre className="max-h-[70vh] overflow-auto rounded border border-gray-200 bg-slate-950 p-4 text-xs leading-5 text-green-300">
              {logText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkflowContainerLogsModal;
