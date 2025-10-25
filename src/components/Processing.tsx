import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Braces,
  CheckCircle,
  CheckSquare,
  Clock,
  Cpu,
  FileText,
  FolderSearch,
  Eye,
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
  Rocket,
  StopCircle,
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatWorkflow, XnatSystemStats } from '../services/xnat-api';
import { WorkflowBuildDirModal } from './WorkflowBuildDir';
import { WorkflowContainerSummaryModal, WorkflowContainerRawModal } from './WorkflowContainerSummary';
import { ContainerLogViewer } from './ContainerLogViewer';
import { WorkflowContainerLogsModal } from './WorkflowContainerLogs';
import { getWorkflowContainerId } from '../utils/workflows';

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
  const [filters, setFilters] = useState({
    project: '',
    label: '',
    status: '',
    user: '',
    pipeline: '',
  });
  const [selectedBuildDirWorkflowId, setSelectedBuildDirWorkflowId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [selectedLogContainerId, setSelectedLogContainerId] = useState<string | null>(null);
  const [selectedStdoutContainerId, setSelectedStdoutContainerId] = useState<string | null>(null);
  const [selectedStderrContainerId, setSelectedStderrContainerId] = useState<string | null>(null);
  const [selectedRawJsonContainerId, setSelectedRawJsonContainerId] = useState<string | null>(null);
  const [killingContainers, setKillingContainers] = useState<Set<string>>(new Set());
  const [selectedContainers, setSelectedContainers] = useState<Set<string>>(new Set());
  // const [killResults, setKillResults] = useState<{ succeeded: number; failed: number; total: number; error?: string } | null>(null);
  const [killProgress, setKillProgress] = useState<Map<string, 'pending' | 'killing' | 'success' | 'failed'>>(new Map());
  const [showKillModal, setShowKillModal] = useState(false);
  const [showKillConfirmation, setShowKillConfirmation] = useState(false);

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

  const rawJsonContainerQuery = useQuery({
    queryKey: ['container-raw-json', selectedRawJsonContainerId],
    enabled: !!client && !!selectedRawJsonContainerId,
    queryFn: () => (client && selectedRawJsonContainerId ? client.getContainer(selectedRawJsonContainerId) : Promise.resolve(null)),
  });

  const systemQuery = useQuery<XnatSystemStats | null>({
    queryKey: ['processing-system-stats'],
    enabled: !!client,
    queryFn: () => client?.getSystemStats() || null,
    refetchInterval: 60000,
  });

  const workflows = workflowsQuery.data ?? [];
  const systemStats = systemQuery.data ?? null;

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    workflows.forEach((workflow) => {
      const status = getWorkflowStatus(workflow);
      if (status) {
        set.add(status);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [workflows]);

  const filteredWorkflows = useMemo(() => {
    const projectFilter = filters.project.trim().toLowerCase();
    const labelFilter = filters.label.trim().toLowerCase();
    const statusFilter = filters.status.trim().toLowerCase();
    const userFilter = filters.user.trim().toLowerCase();
    const pipelineFilter = filters.pipeline.trim().toLowerCase();

    return workflows.filter((workflow) => {
      const project = getWorkflowProject(workflow).toLowerCase();
      const label = getWorkflowLabel(workflow).toLowerCase();
      const status = getWorkflowStatus(workflow).toLowerCase();
      const user = getWorkflowUser(workflow).toLowerCase();
      const pipeline = getWorkflowName(workflow).toLowerCase();

      if (projectFilter && !project.includes(projectFilter)) return false;
      if (labelFilter && !label.includes(labelFilter)) return false;
      if (userFilter && !user.includes(userFilter)) return false;
      if (pipelineFilter && !pipeline.includes(pipelineFilter)) return false;
      if (statusFilter && status !== statusFilter) return false;
      return true;
    });
  }, [workflows, filters]);

  const sortedWorkflows = useMemo(() => {
    return [...filteredWorkflows].sort((a, b) => {
      const dateA = getWorkflowLaunchDate(a)?.getTime() ?? 0;
      const dateB = getWorkflowLaunchDate(b)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [filteredWorkflows]);

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

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value.trim().length > 0),
    [filters]
  );

  const handleFilterChange = (name: keyof typeof filters, value: string) => {
    setFilters((previous) => ({ ...previous, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ project: '', label: '', status: '', user: '', pipeline: '' });
  };

  const handleKillContainer = async (containerId: string) => {
    if (!client || !confirm('Are you sure you want to kill this container?')) return;

    setKillingContainers((prev) => new Set(prev).add(containerId));
    try {
      const success = await client.killContainer(containerId);
      if (success) {
        containersQuery.refetch();
        workflowsQuery.refetch();
      } else {
        alert('Failed to kill container. Please try again.');
      }
    } catch (error) {
      console.error('Error killing container:', error);
      alert('Error killing container: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setKillingContainers((prev) => {
        const next = new Set(prev);
        next.delete(containerId);
        return next;
      });
    }
  };

  const handleToggleContainer = (containerId: string) => {
    setSelectedContainers((prev) => {
      const next = new Set(prev);
      if (next.has(containerId)) {
        next.delete(containerId);
      } else {
        next.add(containerId);
      }
      return next;
    });
  };

  const handleToggleAllContainers = () => {
    if (selectedContainers.size === paginatedWorkflows.length) {
      setSelectedContainers(new Set());
    } else {
      const allIds = paginatedWorkflows
        .map(w => getWorkflowContainerId(w))
        .filter(Boolean) as string[];
      setSelectedContainers(new Set(allIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedContainers(new Set());
  };

  const handleKillSelectedClick = () => {
    setShowKillConfirmation(true);
  };

  const handleConfirmKill = async () => {
    if (!client || selectedContainers.size === 0) return;

    setShowKillConfirmation(false);
    const containerIds = Array.from(selectedContainers);

    // Initialize progress map with all containers as pending
    const initialProgress = new Map<string, 'pending' | 'killing' | 'success' | 'failed'>();
    containerIds.forEach(id => initialProgress.set(id, 'pending'));
    setKillProgress(initialProgress);
    setShowKillModal(true);

    // Add all to killing set
    setKillingContainers((prev) => new Set([...prev, ...containerIds]));

    let succeeded = 0;
    let failed = 0;

    try {
      // Kill containers one by one to show progress
      for (const containerId of containerIds) {
        // Update status to killing
        setKillProgress(prev => new Map(prev).set(containerId, 'killing'));

        try {
          const success = await client.killContainer(containerId);

          // Update status based on result
          setKillProgress(prev => new Map(prev).set(containerId, success ? 'success' : 'failed'));

          if (success) {
            succeeded++;
          } else {
            failed++;
          }
        } catch (error) {
          setKillProgress(prev => new Map(prev).set(containerId, 'failed'));
          failed++;
        }
      }

      if (succeeded > 0) {
        containersQuery.refetch();
        workflowsQuery.refetch();
      }

      setSelectedContainers(new Set());

      // Auto-close after 10 seconds when complete
      setTimeout(() => {
        setShowKillModal(false);
        setKillProgress(new Map());
      }, 10000);
    } catch (error) {
      console.error('Error killing containers:', error);
    } finally {
      // Remove all from killing set
      setKillingContainers((prev) => {
        const next = new Set(prev);
        containerIds.forEach(id => next.delete(id));
        return next;
      });
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Processing Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor workflows launched across this XNAT instance and review recent container activity.
            </p>
          </div>
          <Link
            to="/processing/commands"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Rocket className="h-4 w-4" />
            Launch Processing
          </Link>
        </div>
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

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Project
            </label>
            <input
              type="text"
              value={filters.project}
              onChange={(event) => handleFilterChange('project', event.target.value)}
              placeholder="Filter by project"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Label
            </label>
            <input
              type="text"
              value={filters.label}
              onChange={(event) => handleFilterChange('label', event.target.value)}
              placeholder="Filter by label"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pipeline
            </label>
            <input
              type="text"
              value={filters.pipeline}
              onChange={(event) => handleFilterChange('pipeline', event.target.value)}
              placeholder="Filter by pipeline"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              User
            </label>
            <input
              type="text"
              value={filters.user}
              onChange={(event) => handleFilterChange('user', event.target.value)}
              placeholder="Filter by user"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-100"
            >
              Clear filters
            </button>
          </div>
        )}

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
            <>
              {/* Selection Toolbar */}
              {selectedContainers.size > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedContainers.size} container{selectedContainers.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-sm text-blue-700 hover:text-blue-900 underline"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleKillSelectedClick}
                      disabled={Array.from(selectedContainers).some(id => killingContainers.has(id))}
                      className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <StopCircle className="h-4 w-4" />
                      Mark as Failed
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                      <button
                        type="button"
                        onClick={handleToggleAllContainers}
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      >
                        {selectedContainers.size === paginatedWorkflows.filter(w => getWorkflowContainerId(w)).length && paginatedWorkflows.length > 0 ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
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
                  const containerId = getWorkflowContainerId(workflow);

                  return (
                    <tr key={rowKey} className="hover:bg-gray-50">
                        <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                          {containerId && (
                            <button
                              type="button"
                              onClick={() => handleToggleContainer(containerId)}
                              className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                            >
                              {selectedContainers.has(containerId) ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
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
                            {containerId && (
                              <>
                                <span className="text-gray-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedContainerId(containerId)}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                                  title="View Container Summary"
                                >
                                  <Eye className="h-3 w-3" />
                                </button>
                                <span className="text-gray-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRawJsonContainerId(containerId)}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                                  title="View Raw JSON"
                                >
                                  <Braces className="h-3 w-3" />
                                </button>
                                <span className="text-gray-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStdoutContainerId(containerId)}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                                  title="View StdOut.log"
                                >
                                  <FileText className="h-3 w-3" />
                                </button>
                                <span className="text-gray-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStderrContainerId(containerId)}
                                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-500"
                                  title="View StdErr.log"
                                >
                                  <FileText className="h-3 w-3" />
                                </button>
                                {(status.toLowerCase() === 'running' || status.toLowerCase() === 'active') && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <button
                                      type="button"
                                      onClick={() => handleKillContainer(containerId)}
                                      disabled={killingContainers.has(containerId)}
                                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-500 disabled:opacity-50"
                                    >
                                      {killingContainers.has(containerId) ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <StopCircle className="h-3 w-3" />
                                      )}
                                      Kill
                                    </button>
                                  </>
                                )}
                              </>
                            )}
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
            </>
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
                  const containerId = getWorkflowContainerId(workflow);

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
                          {containerId && (
                            <>
                              <span className="text-gray-300">•</span>
                              <button
                                type="button"
                                onClick={() => setSelectedContainerId(containerId)}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                              >
                                <Eye className="h-3 w-3" />
                                Summary
                              </button>
                              {(status.toLowerCase() === 'running' || status.toLowerCase() === 'active') && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <button
                                    type="button"
                                    onClick={() => handleKillContainer(containerId)}
                                    disabled={killingContainers.has(containerId)}
                                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-500 disabled:opacity-50"
                                  >
                                    {killingContainers.has(containerId) ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <StopCircle className="h-3 w-3" />
                                    )}
                                    Kill
                                  </button>
                                </>
                              )}
                            </>
                          )}
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
      <WorkflowBuildDirModal
        workflowId={selectedBuildDirWorkflowId}
        onClose={() => setSelectedBuildDirWorkflowId(null)}
      />
      <WorkflowContainerSummaryModal
        containerId={selectedContainerId}
        onClose={() => setSelectedContainerId(null)}
      />
      <ContainerLogViewer
        containerId={selectedLogContainerId}
        onClose={() => setSelectedLogContainerId(null)}
      />
      <WorkflowContainerLogsModal
        containerId={selectedStdoutContainerId}
        logType="stdout"
        onClose={() => setSelectedStdoutContainerId(null)}
      />
      <WorkflowContainerLogsModal
        containerId={selectedStderrContainerId}
        logType="stderr"
        onClose={() => setSelectedStderrContainerId(null)}
      />
      <WorkflowContainerRawModal
        container={rawJsonContainerQuery.data ?? null}
        open={!!selectedRawJsonContainerId}
        onClose={() => setSelectedRawJsonContainerId(null)}
      />

      {/* Kill Confirmation Modal */}
      {showKillConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
              onClick={() => setShowKillConfirmation(false)}
            ></div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                      Mark {selectedContainers.size} Container{selectedContainers.size !== 1 ? 's' : ''} as Failed?
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to mark {selectedContainers.size} selected container{selectedContainers.size !== 1 ? 's' : ''} as failed? This will kill the container{selectedContainers.size !== 1 ? 's' : ''} and cannot be undone.
                      </p>
                      <div className="mt-4 max-h-48 overflow-y-auto rounded-md bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Containers to mark as failed:</p>
                        <ul className="space-y-1">
                          {Array.from(selectedContainers).map(containerId => {
                            const workflow = paginatedWorkflows.find(w => getWorkflowContainerId(w) === containerId);
                            const label = workflow ? getWorkflowLabel(workflow) : containerId;
                            return (
                              <li key={containerId} className="text-xs text-gray-600 flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span className="flex-1">
                                  <span className="font-medium">{label}</span>
                                  <span className="text-gray-400 ml-1">({containerId})</span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmKill}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 sm:w-auto"
                >
                  Yes, Mark as Failed
                </button>
                <button
                  type="button"
                  onClick={() => setShowKillConfirmation(false)}
                  className="inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kill Progress Modal */}
      {showKillModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            ></div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-center align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-6 pb-6 pt-8">
                {/* Spinning loader icon */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                  <RefreshCw className="h-16 w-16 text-blue-600 animate-spin" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Marking Containers as Failed
                </h3>

                {/* Progress text */}
                <p className="text-blue-600 text-base mb-2">
                  Processing {Array.from(killProgress.values()).filter(s => s === 'success' || s === 'failed').length} of {killProgress.size} containers
                </p>

                {/* Current item */}
                {(() => {
                  const currentEntry = Array.from(killProgress.entries()).find(([_, status]) => status === 'killing');
                  if (currentEntry) {
                    const [containerId] = currentEntry;
                    const workflow = paginatedWorkflows.find(w => getWorkflowContainerId(w) === containerId);
                    const label = workflow ? getWorkflowLabel(workflow) : containerId;
                    return (
                      <p className="text-gray-600 text-sm mb-6">
                        Current: <strong>{label}</strong>
                      </p>
                    );
                  }
                  return null;
                })()}

                {/* Progress bar */}
                <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${(Array.from(killProgress.values()).filter(s => s === 'success' || s === 'failed').length / killProgress.size) * 100}%`
                    }}
                  />
                </div>

                {/* Errors section */}
                {Array.from(killProgress.values()).filter(s => s === 'failed').length > 0 && (
                  <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-left">
                    <h4 className="text-sm font-semibold text-red-900 mb-2">Errors:</h4>
                    <ul className="space-y-1 text-xs text-red-800">
                      {Array.from(killProgress.entries())
                        .filter(([_, status]) => status === 'failed')
                        .map(([containerId]) => {
                          const workflow = paginatedWorkflows.find(w => getWorkflowContainerId(w) === containerId);
                          const label = workflow ? getWorkflowLabel(workflow) : containerId;
                          return (
                            <li key={containerId} className="flex items-start gap-2">
                              <span>•</span>
                              <span>{label}: Failed to kill container</span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}

                {/* Completion message */}
                {Array.from(killProgress.values()).every(s => s === 'success' || s === 'failed') && (
                  <p className="text-gray-500 text-sm mt-4">
                    Completed! This dialog will close automatically.
                  </p>
                )}
              </div>

              {/* Close button */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowKillModal(false);
                    setKillProgress(new Map());
                  }}
                  disabled={Array.from(killProgress.values()).some(s => s === 'killing')}
                  className="w-full inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Array.from(killProgress.values()).some(s => s === 'killing') ? 'Please wait...' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Processing;
