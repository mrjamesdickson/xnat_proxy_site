import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { X, Minimize2, Maximize2, Clock, CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import { useTaskbar } from '../contexts/TaskbarContext';
import clsx from 'clsx';

export interface ContainerJobsWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContainerJobsWidget({ isOpen, onClose }: ContainerJobsWidgetProps) {
  const { client } = useXnat();
  const { upsertItem, removeItem } = useTaskbar();
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [isMaximized, setIsMaximized] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch recent workflows and filter for containers
  const { data: containers, refetch, isLoading: isLoadingWorkflows, isFetching } = useQuery({
    queryKey: ['container-jobs'],
    enabled: !!client && isOpen,
    refetchInterval: 5000, // Poll every 5 seconds
    queryFn: async () => {
      if (!client) return [];

      try {
        console.log('📊 Fetching workflows for jobs widget (last 1 day)...');
        const workflows = await client.getWorkflows({
          days: 1,
          page: 1,
          size: 50,
          sortable: true,
          admin_workflows: false,
          data_type: 'xdat:user',
        });
        console.log('📊 Workflows received:', workflows);
        console.log('📊 Number of workflows:', workflows?.length || 0);

        // Filter to only workflows that have container information
        const containerWorkflows = (workflows || []).filter((workflow: any) => {
          const containerId = workflow['container-id'] || workflow.containerId || workflow.container_id;
          const comments = workflow.comments || '';
          // Check if workflow has a container ID or container UID in comments
          return (containerId !== undefined && containerId !== null && containerId !== '') ||
                 (comments && typeof comments === 'string' && comments.trim().length > 0);
        });

        console.log('📊 Container workflows:', containerWorkflows.length);

        // Take the most recent 20
        const limited = containerWorkflows.slice(0, 20);

        console.log('📊 Workflows to display:', limited.length);
        setLastUpdate(new Date());
        return limited;
      } catch (error) {
        console.error('❌ Failed to fetch workflows:', error);
        return [];
      }
    },
  });

  // Refresh on mount
  useEffect(() => {
    if (isOpen && client) {
      refetch();
    }
  }, [isOpen, client, refetch]);

  // Calculate taskbar subtitle and icon
  const runningCount = useMemo(() => {
    return containers?.filter((w: any) => {
      const status = (w.status || w.workflow_status || '').toLowerCase();
      return status.includes('running') || status.includes('processing') || status.includes('active');
    }).length || 0;
  }, [containers]);

  const taskbarSubtitle = useMemo(() => {
    if (!containers || containers.length === 0) {
      return 'No active jobs';
    }
    return runningCount > 0 ? `${runningCount} running` : `${containers.length} total`;
  }, [runningCount, containers]);

  // Manage taskbar item when minimized
  useEffect(() => {
    if (isOpen && isMinimized) {
      // Add to taskbar when minimized
      const hasContainers = containers && containers.length > 0;

      upsertItem({
        id: 'container-jobs',
        title: 'Container Jobs',
        subtitle: taskbarSubtitle,
        icon: isFetching ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Layers className="h-4 w-4" />
        ),
        order: 2, // Second position
        onClick: hasContainers ? () => setIsMinimized(false) : undefined,
        onClose: () => {
          if (hasContainers) {
            removeItem('container-jobs');
            setIsMinimized(false);
            onClose();
          } else {
            // Just hide from taskbar when no containers
            setIsMinimized(false);
          }
        },
      });
    } else {
      // Remove from taskbar when not minimized or not open
      removeItem('container-jobs');
    }

    // Cleanup on unmount
    return () => {
      removeItem('container-jobs');
    };
  }, [isOpen, isMinimized, taskbarSubtitle, isFetching, containers, upsertItem, removeItem, onClose]);

  if (!isOpen) return null;

  // Hide widget when minimized (it's shown in taskbar)
  if (isMinimized) return null;

  const filteredContainers = containers?.filter((workflow: any) => {
    if (statusFilter === 'all') return true;
    const status = (workflow.status || workflow.workflow_status || '').toLowerCase();

    if (statusFilter === 'running') {
      return status.includes('running') || status.includes('processing') || status.includes('active');
    }
    if (statusFilter === 'complete') {
      return status.includes('complete') || status.includes('success') || status.includes('done') || status.includes('finished');
    }
    if (statusFilter === 'failed') {
      return status.includes('failed') || status.includes('failure') || status.includes('error') || status.includes('aborted');
    }
    return true;
  }) || [];

  const getStatusIcon = (status: string) => {
    const statusLower = status?.toLowerCase() || '';

    if (statusLower === 'complete' || statusLower === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (statusLower === 'failed' || statusLower === 'error') {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    if (statusLower === 'running' || statusLower === 'processing') {
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';

    if (statusLower === 'complete' || statusLower === 'success') {
      return 'text-green-700 bg-green-50';
    }
    if (statusLower === 'failed' || statusLower === 'error') {
      return 'text-red-700 bg-red-50';
    }
    if (statusLower === 'running' || statusLower === 'processing') {
      return 'text-blue-700 bg-blue-50';
    }
    return 'text-gray-700 bg-gray-50';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
    <div
      className="fixed bottom-4 right-4 z-[75] w-96 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all dark:border-slate-700 dark:bg-slate-900"
      style={{ maxHeight: '500px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <RefreshCw className={clsx("h-4 w-4 text-blue-600", isFetching && "animate-spin")} />
            <h3 className="text-sm font-semibold text-gray-900">Container Jobs</h3>
            {containers && containers.length > 0 && (
              <span className="text-xs text-gray-500">({containers.length})</span>
            )}
          </div>
          {lastUpdate && (
            <div className="text-xs text-gray-500 ml-6">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            aria-label="Minimize to taskbar"
            title="Minimize to taskbar"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsMaximized(true)}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            aria-label="Maximize to full screen"
            title="Maximize to full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
          {/* Status Filter */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={clsx(
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('running')}
                className={clsx(
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  statusFilter === 'running'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Running
              </button>
              <button
                onClick={() => setStatusFilter('complete')}
                className={clsx(
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  statusFilter === 'complete'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Complete
              </button>
              <button
                onClick={() => setStatusFilter('failed')}
                className={clsx(
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  statusFilter === 'failed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Failed
              </button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '390px' }}>
            {isLoadingWorkflows ? (
              <div className="p-8 text-center text-gray-500">
                <Loader2 className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
                <p className="text-sm">Loading...</p>
              </div>
            ) : !filteredContainers || filteredContainers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No {statusFilter !== 'all' ? statusFilter : ''} jobs</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredContainers.map((workflow: any, index: number) => {
                const status = workflow.status || workflow.workflow_status || 'Unknown';
                const workflowId = workflow.workflow_id || workflow.id;
                const wfid = workflow.wfid || workflow.ID;
                const pipelineName = workflow.pipeline_name || workflow.pipelineName || workflow.label || 'Unknown Pipeline';
                const launchTime = workflow.launch_time || workflow.launchTime || workflow.create_date;
                const comments = workflow.comments;
                const externalId = workflow.external_id || workflow.externalId;
                // Create a unique key using wfid (unique workflow instance ID) or fallback to index
                const uniqueKey = wfid || `${workflowId}-${index}`;

                return (
                  <div key={uniqueKey} className="p-3 hover:bg-gray-50 cursor-pointer">
                    <Link
                      to="/processing"
                      className="flex items-start gap-3"
                    >
                      <div className="mt-0.5">
                        {getStatusIcon(status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {pipelineName}
                          </div>
                          <span className={clsx(
                            'text-xs px-2 py-0.5 rounded-full shrink-0',
                            getStatusColor(status)
                          )}>
                            {status}
                          </span>
                        </div>
                        {comments && (
                          <div className="text-xs text-gray-600 mb-1 truncate">
                            {comments}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {launchTime && (
                            <span>{formatDate(launchTime)}</span>
                          )}
                          {externalId && (
                            <span>{externalId}</span>
                          )}
                        </div>
                        {workflowId && (
                          <div className="text-xs text-gray-400 mt-1 font-mono truncate">
                            ID: {workflowId}
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                );
                })}
              </div>
            )}
          </div>
      </div>
    </div>

    {/* Maximized Modal View */}
    {isMaximized && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <RefreshCw className={clsx("h-5 w-5 text-blue-600", isFetching && "animate-spin")} />
                <h2 className="text-xl font-semibold text-gray-900">Container Jobs</h2>
                {containers && containers.length > 0 && (
                  <span className="text-sm text-gray-500">({containers.length})</span>
                )}
              </div>
              {lastUpdate && (
                <div className="text-sm text-gray-500 ml-7">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsMaximized(false);
                  setIsMinimized(true);
                }}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                aria-label="Minimize"
                title="Minimize to taskbar"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsMaximized(false)}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('running')}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                  statusFilter === 'running'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Running
              </button>
              <button
                onClick={() => setStatusFilter('complete')}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                  statusFilter === 'complete'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Complete
              </button>
              <button
                onClick={() => setStatusFilter('failed')}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                  statusFilter === 'failed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Failed
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingWorkflows ? (
              <div className="p-12 text-center text-gray-500">
                <Loader2 className="h-12 w-12 mx-auto mb-3 text-gray-400 animate-spin" />
                <p className="text-base">Loading...</p>
              </div>
            ) : !filteredContainers || filteredContainers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-base">No {statusFilter !== 'all' ? statusFilter : ''} jobs</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContainers.map((workflow: any, index: number) => {
                  const status = workflow.status || workflow.workflow_status || 'Unknown';
                  const workflowId = workflow.workflow_id || workflow.id;
                  const wfid = workflow.wfid || workflow.ID;
                  const pipelineName = workflow.pipeline_name || workflow.pipelineName || workflow.label || 'Unknown Pipeline';
                  const launchTime = workflow.launch_time || workflow.launchTime || workflow.create_date;
                  const comments = workflow.comments;
                  const externalId = workflow.external_id || workflow.externalId;
                  const uniqueKey = wfid || `${workflowId}-${index}`;

                  return (
                    <div key={uniqueKey} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <Link
                        to="/processing"
                        className="block"
                        onClick={() => setIsMaximized(false)}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="mt-1">
                            {getStatusIcon(status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base text-gray-900 mb-1 truncate">
                              {pipelineName}
                            </div>
                            <span className={clsx(
                              'inline-block text-xs px-2 py-1 rounded-full',
                              getStatusColor(status)
                            )}>
                              {status}
                            </span>
                          </div>
                        </div>
                        {comments && (
                          <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {comments}
                          </div>
                        )}
                        <div className="flex flex-col gap-1 text-sm text-gray-500">
                          {launchTime && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formatDate(launchTime)}</span>
                            </div>
                          )}
                          {externalId && (
                            <div className="text-xs truncate">
                              External: {externalId}
                            </div>
                          )}
                          {workflowId && (
                            <div className="text-xs text-gray-400 font-mono truncate">
                              ID: {workflowId}
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default ContainerJobsWidget;
