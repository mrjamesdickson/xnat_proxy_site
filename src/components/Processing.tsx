import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { WorkflowBuildDirModal } from './WorkflowBuildDir';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  FileText,
  FolderSearch,
  Grid3x3,
  HardDrive,
  List,
  MonitorSpeaker,
  Pause,
  Play,
  RefreshCw,
  Square,
  Info,
  XCircle,
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatContainer, XnatWorkflow, XnatSystemStats } from '../services/xnat-api';

const TIMEFRAME_OPTIONS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'Last 365 Days', value: 365 },
  { label: 'View All', value: -1 },
];

const FAILURE_KEYWORDS = ['failed', 'failure', 'error', 'aborted', 'cancelled', 'canceled'];
const COMPLETE_KEYWORDS = ['complete', 'completed', 'success', 'done', 'finished'];

const getWorkflowStatus = (workflow: XnatWorkflow): string => {
  const status = workflow.status ?? (workflow as Record<string, unknown>)['status'];
  return typeof status === 'string' ? status : '';
};

const isWorkflowFailed = (workflow: XnatWorkflow): boolean => {
  const status = getWorkflowStatus(workflow).toLowerCase();
  return FAILURE_KEYWORDS.some((keyword) => status.includes(keyword));
};

const isWorkflowComplete = (workflow: XnatWorkflow): boolean => {
  const status = getWorkflowStatus(workflow).toLowerCase();
  return COMPLETE_KEYWORDS.some((keyword) => status.includes(keyword));
};

const isWorkflowActive = (workflow: XnatWorkflow): boolean => {
  const status = getWorkflowStatus(workflow);
  if (!status) return false;
  return !isWorkflowComplete(workflow) && !isWorkflowFailed(workflow);
};

const getWorkflowPercent = (workflow: XnatWorkflow): number | undefined => {
  const value = workflow.percent_complete ?? (workflow as Record<string, unknown>).percentageComplete;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getWorkflowLaunchDate = (workflow: XnatWorkflow): Date | undefined => {
  const raw = workflow.launchTime ?? workflow.launch_time;
  if (typeof raw === 'number') return new Date(raw);
  if (typeof raw === 'string') {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return new Date(numeric);
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
};

const getWorkflowProject = (workflow: XnatWorkflow): string => {
  const value = workflow.externalId ?? (workflow as Record<string, unknown>)['external-id'];
  return typeof value === 'string' ? value : '';
};

const getWorkflowLabel = (workflow: XnatWorkflow): string => {
  if (typeof workflow.label === 'string' && workflow.label.trim()) {
    return workflow.label;
  }
  if (workflow.id !== undefined) {
    return String(workflow.id);
  }
  return '';
};

const getWorkflowStep = (workflow: XnatWorkflow): string => {
  const value = workflow.stepDescription ?? (workflow as Record<string, unknown>)['step-description'];
  return typeof value === 'string' ? value : '';
};

const getWorkflowDetails = (workflow: XnatWorkflow): string | undefined => {
  if (typeof workflow.details === 'string') return workflow.details;
  if (typeof workflow.comments === 'string') return workflow.comments;
  if (workflow.details && typeof workflow.details === 'object') {
    try {
      return JSON.stringify(workflow.details, null, 2);
    } catch (error) {
      console.warn('Unable to stringify workflow details', error);
    }
  }
  return undefined;
};

const getWorkflowName = (workflow: XnatWorkflow): string => {
  const value = workflow.pipelineName ?? (workflow as Record<string, unknown>)['pipeline-name'];
  return typeof value === 'string' && value.trim().length > 0 ? value : '—';
};

const getWorkflowUser = (workflow: XnatWorkflow): string => {
  const value = workflow.createUser ?? (workflow as Record<string, unknown>)['create-user'];
  return typeof value === 'string' ? value : '';
};

const getStatusIcon = (status: string) => {
  const normalizedStatus = status.toLowerCase().replace(/[_\s-]+/g, '');

  switch (normalizedStatus) {
    case 'running':
    case 'active':
    case 'inprogress':
      return <Play className="h-4 w-4 text-green-500" />;
    case 'queued':
    case 'pending':
    case 'waiting':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'complete':
    case 'completed':
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
    case 'error':
    case 'failure':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'cancelled':
    case 'canceled':
    case 'killed':
      return <Square className="h-4 w-4 text-gray-500" />;
    case 'idle':
    case 'stopped':
    case 'paused':
      return <Pause className="h-4 w-4 text-blue-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusPillColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase().replace(/[_\s-]+/g, '');

  switch (normalizedStatus) {
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
    case 'idle':
    case 'stopped':
    case 'paused':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (date?: Date): string => {
  if (!date) return '—';
  const formatted = date.toLocaleString();
  return formatted;
};

const formatSystemValue = (value?: number, decimals = 1): string => {
  if (typeof value !== 'number') return '—';
  return value.toFixed(decimals);
};

const formatPercent = (value?: number): string => {
  if (typeof value !== 'number') return '—';
  return `${value.toFixed(0)}%`;
};

export function Processing() {
  const { client, currentUser } = useXnat();
  const [days, setDays] = useState<number>(7);
  const [adminWorkflows, setAdminWorkflows] = useState(false);
  const [dismissedCallouts, setDismissedCallouts] = useState({ active: false, failed: false });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedBuildDirWorkflowId, setSelectedBuildDirWorkflowId] = useState<string | null>(null);

  const isAdminUser = useMemo(() => {
    const roles = currentUser?.authorization?.roles ?? currentUser?.roles ?? [];
    return roles?.some((role) => typeof role === 'string' && role.toLowerCase().includes('admin'));
  }, [currentUser]);

  const workflowsQuery = useQuery({
    queryKey: ['processing-workflows', { days, adminWorkflows }],
    enabled: !!client,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!client) return [] as XnatWorkflow[];

      const pageSize = 200;
      const combined: XnatWorkflow[] = [];
      let page = 1;
      const maxPages = 100;

      while (page <= maxPages) {
        const batch = await client.getWorkflows({
          days,
          page,
          size: pageSize,
          sortable: true,
          admin_workflows: adminWorkflows,
          data_type: 'xdat:user',
        });

        combined.push(...batch);

        if (batch.length < pageSize) {
          break;
        }

        page += 1;
      }

      if (page > maxPages) {
        console.warn('Processing workflows exceeded pagination guard. Showing first', maxPages * pageSize, 'items.');
      }

      return combined;
    },
  });

  const containersQuery = useQuery({
    queryKey: ['processing-containers'],
    enabled: !!client,
    queryFn: () => client?.getContainers() || [],
    refetchInterval: 15000,
  });

  const systemQuery = useQuery<XnatSystemStats | null>({
    queryKey: ['processing-system-stats'],
    enabled: !!client,
    queryFn: () => client?.getSystemStats() || null,
    refetchInterval: 60000,
  });

  const workflows = workflowsQuery.data ?? [];
  const containers = containersQuery.data ?? [];
  const systemStats = systemQuery.data ?? null;

  const sortedWorkflows = useMemo(() => {
    return [...workflows].sort((a, b) => {
      const dateA = getWorkflowLaunchDate(a)?.getTime() ?? 0;
      const dateB = getWorkflowLaunchDate(b)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [workflows]);

  const totalPages = useMemo(() => {
    if (sortedWorkflows.length === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(sortedWorkflows.length / pageSize));
  }, [sortedWorkflows.length, pageSize]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [days, adminWorkflows, pageSize]);

  const safePage = Math.min(currentPage, totalPages);

  const paginatedWorkflows = useMemo(() => {
    if (sortedWorkflows.length === 0) {
      return [] as XnatWorkflow[];
    }

    const startIndex = (safePage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedWorkflows.slice(startIndex, endIndex);
  }, [sortedWorkflows, safePage, pageSize]);

  const paginationSummary = useMemo(() => {
    if (sortedWorkflows.length === 0) {
      return { start: 0, end: 0 };
    }

    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, sortedWorkflows.length);
    return { start, end };
  }, [safePage, pageSize, sortedWorkflows.length]);

  const activeWorkflows = useMemo(
    () => sortedWorkflows.filter((workflow) => isWorkflowActive(workflow)),
    [sortedWorkflows]
  );

  const failedWorkflows = useMemo(
    () => sortedWorkflows.filter((workflow) => isWorkflowFailed(workflow)),
    [sortedWorkflows]
  );

  const showActiveCallout = !dismissedCallouts.active && activeWorkflows.length > 0;
  const showFailedCallout = !dismissedCallouts.failed && failedWorkflows.length > 0;

  const refreshData = () => {
    workflowsQuery.refetch();
    containersQuery.refetch();
    systemQuery.refetch();
  };

  const handleChangeTimeframe = (value: number) => {
    setDays(value);
    setDismissedCallouts({ active: false, failed: false });
  };

  if (!client) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-lg bg-yellow-50 p-6 text-sm text-yellow-800 max-w-md text-center">
          <p className="font-medium">You are not connected to an XNAT server.</p>
          <p className="mt-2">Sign in through the portal to view processing activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Processing Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor workflows launched across this XNAT instance and review recent container activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {typeof systemStats?.cpu_usage === 'number' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Cpu className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatPercent(systemStats.cpu_usage)}
                </div>
                <div className="text-xs text-gray-500">CPU Usage</div>
              </div>
            </div>
          </div>
        )}

        {typeof systemStats?.memory_usage === 'number' && typeof systemStats?.memory_total === 'number' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <MonitorSpeaker className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatPercent((systemStats.memory_usage / systemStats.memory_total) * 100)}
                </div>
                <div className="text-xs text-gray-500">
                  Memory {formatSystemValue(systemStats.memory_usage)} / {formatSystemValue(systemStats.memory_total)} GB
                </div>
              </div>
            </div>
          </div>
        )}

        {typeof systemStats?.disk_usage === 'number' && typeof systemStats?.disk_total === 'number' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <HardDrive className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatPercent((systemStats.disk_usage / systemStats.disk_total) * 100)}
                </div>
                <div className="text-xs text-gray-500">
                  Disk {formatSystemValue(systemStats.disk_usage)} / {formatSystemValue(systemStats.disk_total)} TB
                </div>
              </div>
            </div>
          </div>
        )}

        {typeof systemStats?.active_jobs === 'number' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{systemStats.active_jobs}</div>
                <div className="text-xs text-gray-500">Active Jobs</div>
              </div>
            </div>
          </div>
        )}

        {systemStats?.version && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">XNAT v{systemStats.version}</div>
                <div className="text-xs text-gray-500">Current Version</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {TIMEFRAME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChangeTimeframe(option.value)}
                className={clsx(
                  'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                  days === option.value
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-l-lg border',
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b',
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            {isAdminUser && (
              <button
                type="button"
                onClick={() => setAdminWorkflows((value) => !value)}
                className={clsx(
                  'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  adminWorkflows
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {adminWorkflows ? 'Showing Admin Workflows' : 'Include Admin Workflows'}
              </button>
            )}
            <button
              type="button"
              onClick={refreshData}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RefreshCw className={clsx('mr-2 h-4 w-4', { 'animate-spin': workflowsQuery.isFetching })} />
              Refresh
            </button>
          </div>
        </div>

        {(showActiveCallout || showFailedCallout) && (
          <div className="mt-4 space-y-3">
            {showActiveCallout && (
              <div className="flex items-start justify-between rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <div className="flex items-start gap-2">
                  <Play className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-medium">Processing is active.</p>
                    <p className="mt-1 text-green-700">
                      {activeWorkflows.length} workflow{activeWorkflows.length === 1 ? '' : 's'} are still in progress.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-green-700 hover:text-green-900"
                  onClick={() => setDismissedCallouts((prev) => ({ ...prev, active: true }))}
                >
                  Dismiss
                </button>
              </div>
            )}
            {showFailedCallout && (
              <div className="flex items-start justify-between rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-medium">Some processing has recently failed.</p>
                    <p className="mt-1 text-red-700">
                      {failedWorkflows.length} workflow{failedWorkflows.length === 1 ? '' : 's'} reported an error.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-red-700 hover:text-red-900"
                  onClick={() => setDismissedCallouts((prev) => ({ ...prev, failed: true }))}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Workflows</div>
            <div className="mt-1 text-2xl font-semibold text-blue-900">{sortedWorkflows.length.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-green-700">Active</div>
            <div className="mt-1 text-2xl font-semibold text-green-900">{activeWorkflows.length.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-red-700">Failed</div>
            <div className="mt-1 text-2xl font-semibold text-red-900">{failedWorkflows.length.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Activity</h2>
            <div className="text-xs text-gray-500">
              Updated {new Date().toLocaleTimeString()}
            </div>
          </div>

          {workflowsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-md border border-gray-200 bg-gray-50 p-4">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : workflowsQuery.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Unable to load workflows. {workflowsQuery.error instanceof Error ? workflowsQuery.error.message : 'Please try refreshing.'}
            </div>
          ) : sortedWorkflows.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
              No workflows were found for the selected time period.
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Project</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Label</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Workflow</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Launched</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Progress</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedWorkflows.map((workflow, index) => {
                    const status = getWorkflowStatus(workflow);
                    const launchDate = getWorkflowLaunchDate(workflow);
                    const percent = getWorkflowPercent(workflow);
                    const details = getWorkflowDetails(workflow);
                    const project = getWorkflowProject(workflow);
                    const step = getWorkflowStep(workflow);
                    const label = getWorkflowLabel(workflow);
                    const rawId = workflow.wfid ?? workflow.id ?? (workflow as Record<string, unknown>).ID ?? label;
                    const workflowKey = rawId ? String(rawId) : '';
                    const rowKey = workflowKey || `${label}-${index}`;
                    const workflowName = getWorkflowName(workflow);
                    const workflowUser = getWorkflowUser(workflow) || '—';

                    return (
                      <tr key={rowKey} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {project || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{label || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className={clsx('inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-semibold', getStatusPillColor(status))}>
                          {getStatusIcon(status)}
                          {status || 'Unknown'}
                        </span>
                        {workflowKey && (
                          <div className="flex items-center gap-2 text-xs">
                            <Link
                              to={`/processing/workflows/${encodeURIComponent(String(workflowKey))}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                            >
                              <Info className="h-3 w-3" />
                              Details
                            </Link>
                            <span className="text-gray-300">•</span>
                            <button
                              type="button"
                              onClick={() => setSelectedBuildDirWorkflowId(workflowKey)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                            >
                              <FolderSearch className="h-3 w-3" />
                              Build Dir
                            </button>
                            <span className="text-gray-300">•</span>
                            <Link
                              to={`/processing/workflows/${encodeURIComponent(String(workflowKey))}/log`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                            >
                              <FileText className="h-3 w-3" />
                              Log
                            </Link>
                          </div>
                        )}
                      </div>
                    </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium text-gray-900">{workflowName}</div>
                          {details && (
                            <div className="mt-1 text-xs text-gray-500 truncate max-w-xs" title={details}>
                              {details}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{formatDate(launchDate)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {percent !== undefined ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{step || 'In progress'}</span>
                                <span>{percent.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-blue-500"
                                  style={{ width: `${Math.min(percent, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">{step || '—'}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {workflowUser}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sortedWorkflows.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    Showing {paginationSummary.start.toLocaleString()}-
                    {paginationSummary.end.toLocaleString()} of {sortedWorkflows.length.toLocaleString()} workflows
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                      Page Size
                      <select
                        className="rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                      >
                        {[25, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size} per page
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={safePage <= 1}
                        className={clsx(
                          'rounded-md border px-3 py-1 text-sm font-medium shadow-sm transition-colors',
                          safePage <= 1
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        Previous
                      </button>
                      <span className="text-xs uppercase tracking-wide text-gray-500">
                        Page {safePage.toLocaleString()} of {totalPages.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={safePage >= totalPages}
                        className={clsx(
                          'rounded-md border px-3 py-1 text-sm font-medium shadow-sm transition-colors',
                          safePage >= totalPages
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Grid View */
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedWorkflows.map((workflow, index) => {
                  const status = getWorkflowStatus(workflow);
                  const launchDate = getWorkflowLaunchDate(workflow);
                  const percent = getWorkflowPercent(workflow);
                  const details = getWorkflowDetails(workflow);
                  const project = getWorkflowProject(workflow);
                  const step = getWorkflowStep(workflow);
                  const label = getWorkflowLabel(workflow);
                  const rawId = workflow.wfid ?? workflow.id ?? (workflow as Record<string, unknown>).ID ?? label;
                  const workflowKey = rawId ? String(rawId) : '';
                  const cardKey = workflowKey || `${label}-${index}`;
                  const workflowName = getWorkflowName(workflow);
                  const workflowUser = getWorkflowUser(workflow) || '—';

                  return (
                    <div key={cardKey} className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{label || '—'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{project || '—'}</div>
                        </div>
                        <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ml-2', getStatusPillColor(status))}>
                          {getStatusIcon(status)}
                          {status || 'Unknown'}
                        </span>
                      </div>

                      {workflowKey && (
                        <div className="mb-3 flex items-center gap-3 text-xs">
                          <Link
                            to={`/processing/workflows/${encodeURIComponent(String(workflowKey))}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                          >
                            <Info className="h-3 w-3" />
                            Details
                          </Link>
                          <span className="text-gray-300">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildDirWorkflowId(workflowKey)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                          >
                            <FolderSearch className="h-3 w-3" />
                            Build Dir
                          </button>
                          <span className="text-gray-300">•</span>
                          <Link
                            to={`/processing/workflows/${encodeURIComponent(String(workflowKey))}/log`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                          >
                            <FileText className="h-3 w-3" />
                            Log
                          </Link>
                        </div>
                      )}

                      <div className="space-y-2 mb-3">
                        <div className="text-sm font-medium text-gray-900">{workflowName}</div>

                        {details && (
                          <div className="text-xs text-gray-500 line-clamp-2" title={details}>
                            {details}
                          </div>
                        )}

                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(launchDate)}
                        </div>

                        <div className="text-xs text-gray-500">
                          User: {workflowUser}
                        </div>
                      </div>

                      {percent !== undefined ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="truncate">{step || 'In progress'}</span>
                            <span className="shrink-0 ml-2">{percent.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : step ? (
                        <div className="text-xs text-gray-500">{step}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {sortedWorkflows.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 mt-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    Showing {paginationSummary.start.toLocaleString()}-
                    {paginationSummary.end.toLocaleString()} of {sortedWorkflows.length.toLocaleString()} workflows
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                      Page Size
                      <select
                        className="rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                      >
                        {[25, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size} per page
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={safePage <= 1}
                        className={clsx(
                          'rounded-md border px-3 py-1 text-sm font-medium shadow-sm transition-colors',
                          safePage <= 1
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        Previous
                      </button>
                      <span className="text-xs uppercase tracking-wide text-gray-500">
                        Page {safePage.toLocaleString()} of {totalPages.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={safePage >= totalPages}
                        className={clsx(
                          'rounded-md border px-3 py-1 text-sm font-medium shadow-sm transition-colors',
                          safePage >= totalPages
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Containers</h2>
          <div className="text-xs text-gray-500">{containers.length} total</div>
        </div>

        {containersQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-md bg-gray-100" />
            ))}
          </div>
        ) : containersQuery.isError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Unable to load containers. {containersQuery.error instanceof Error ? containersQuery.error.message : 'Please try refreshing.'}
          </div>
        ) : containers.length === 0 ? (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No containers have been launched recently.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {containers.slice(0, 5).map((container: XnatContainer) => (
              <div key={container.id} className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(container.status)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {container['parent-source-object-name'] || container['docker-image'] || container.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {container['user-id']}
                        {container['project-id'] ? ` • ${container['project-id']}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusPillColor(container.status))}>
                    {container.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Updated {formatDate(new Date(container['status-time']))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <WorkflowBuildDirModal
        workflowId={selectedBuildDirWorkflowId}
        onClose={() => setSelectedBuildDirWorkflowId(null)}
      />
    </div>
  );
}

export default Processing;
