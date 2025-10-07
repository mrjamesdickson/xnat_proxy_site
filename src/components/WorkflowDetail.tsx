import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, RefreshCcw, FileText, Clock, AlertCircle, FolderSearch } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatWorkflow } from '../services/xnat-api';
import { WorkflowBuildDirModal } from './WorkflowBuildDir';

const normalizeStatus = (status?: string): string => status?.toLowerCase().replace(/[_\s-]+/g, '') ?? '';

const getStatusStyles = (status?: string) => {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case 'running':
    case 'active':
    case 'inprogress':
      return 'bg-green-100 text-green-800';
    case 'queued':
    case 'pending':
    case 'waiting':
      return 'bg-yellow-100 text-yellow-800';
    case 'complete':
    case 'completed':
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'failed':
    case 'error':
    case 'failure':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
    case 'canceled':
    case 'killed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDateTime = (value?: number | string): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    const date = new Date(asNumber);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export function WorkflowDetail() {
  const { workflowId } = useParams();
  const { client } = useXnat();
  const [showBuildDir, setShowBuildDir] = useState(false);

  const { data, isLoading, isError, refetch, error } = useQuery<XnatWorkflow | null>({
    queryKey: ['workflow-detail', workflowId],
    queryFn: () => client?.getWorkflow(String(workflowId)) ?? null,
    enabled: Boolean(client) && Boolean(workflowId),
  });

  const detailPairs = useMemo(() => {
    if (!data) return [] as Array<{ label: string; value: string }>;

    const pickDisplay = (...values: unknown[]): string => {
      for (const value of values) {
        if (value === null || value === undefined) {
          continue;
        }
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length > 0) return trimmed;
        }
        if (typeof value === 'number' && !Number.isNaN(value)) {
          return value.toString();
        }
      }
      return '—';
    };

    const rawLaunch = (data as Record<string, unknown>)['launch_time'];
    const launchValue = typeof rawLaunch === 'number' || typeof rawLaunch === 'string' ? rawLaunch : undefined;
    const rawModified = (data as Record<string, unknown>)['mod_time'];
    const modifiedValue = typeof rawModified === 'number' || typeof rawModified === 'string' ? rawModified : undefined;

    return [
      { label: 'Workflow ID', value: pickDisplay(data.id, data.wfid) },
      { label: 'Project', value: pickDisplay((data as Record<string, unknown>)['external-id'], data.externalId) },
      { label: 'Data Type', value: pickDisplay(data.dataType, (data as Record<string, unknown>)['data-type']) },
      { label: 'Pipeline', value: pickDisplay(data.pipelineName, (data as Record<string, unknown>)['pipeline-name']) },
      { label: 'Launch Time', value: formatDateTime(data.launchTime ?? launchValue) },
      { label: 'Last Modified', value: formatDateTime(data.modTime ?? modifiedValue) },
      { label: 'User', value: pickDisplay(data.createUser, (data as Record<string, unknown>)['create-user']) },
      { label: 'Current Step', value: pickDisplay(data.stepDescription, (data as Record<string, unknown>)['step-description']) },
      {
        label: 'Percent Complete',
        value: pickDisplay(
          typeof data.percent_complete === 'number' ? `${data.percent_complete.toFixed(0)}%` : undefined,
          (data as Record<string, unknown>)['percent-complete']
        ),
      },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <Link
              to="/processing"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Processing
            </Link>
            {workflowId && (
              <Link
                to={`/processing/workflows/${workflowId}/log`}
                className="inline-flex items-center rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4 mr-1" />
                View Log
              </Link>
            )}
            {workflowId && (
              <button
                type="button"
                onClick={() => setShowBuildDir(true)}
                className="inline-flex items-center rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                <FolderSearch className="h-4 w-4 mr-1" />
                Build Dir
              </button>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Workflow Details</h1>
          {workflowId && (
            <p className="text-sm text-gray-500">Workflow ID: {workflowId}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-14 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>Unable to load workflow details. {error instanceof Error ? error.message : 'Please try again.'}</span>
        </div>
      ) : !data ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Workflow not found. It may have been deleted or you may not have permission to view it.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold', getStatusStyles(data.status))}>
                Status: {data.status || 'Unknown'}
              </span>
              {typeof data.percent_complete === 'number' && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {data.percent_complete.toFixed(0)}% complete
                </span>
              )}
              {data.pipelineName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  <Clock className="h-4 w-4" />
                  {data.pipelineName}
                </span>
              )}
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detailPairs.map(({ label, value }) => (
                <div key={label} className="rounded-md border border-gray-100 bg-gray-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
                  <dd className="mt-1 text-sm text-gray-900 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {(data.details || data.comments) && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Details</h2>
              {typeof data.details === 'string' ? (
                <pre className="whitespace-pre-wrap break-words text-sm text-gray-700 bg-gray-50 rounded-md p-4 border border-gray-100">
                  {data.details}
                </pre>
              ) : data.details ? (
                <pre className="overflow-auto rounded-md border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                  {JSON.stringify(data.details, null, 2)}
                </pre>
              ) : null}
              {data.comments && (
                <p className="mt-4 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  {data.comments}
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Raw Workflow Payload</h2>
            <div className="rounded-md border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 overflow-x-auto">
              <pre className="whitespace-pre text-xs">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <WorkflowBuildDirModal
        workflowId={showBuildDir && workflowId ? workflowId : null}
        onClose={() => setShowBuildDir(false)}
      />
    </div>
  );
}

export default WorkflowDetail;
