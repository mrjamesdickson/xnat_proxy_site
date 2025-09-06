import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
  Cpu,
  HardDrive,
  MonitorSpeaker,
  Activity,
  Zap,
  BarChart3,
  Filter,
  Eye,
  X,
  Calendar
} from 'lucide-react';
import clsx from 'clsx';
import type { XnatContainer, XnatWorkflow, XnatProcess, XnatSystemStats } from '../services/xnat-api';

export function Processing() {
  const { client } = useXnat();
  const [selectedTab, setSelectedTab] = useState<'jobs' | 'processes' | 'system'>('jobs');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [selectedContainer, setSelectedContainer] = useState<XnatContainer | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<XnatWorkflow | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<XnatProcess | null>(null);
  const [workflowFilters, setWorkflowFilters] = useState({
    page: 1,
    id: "",
    data_type: "xdat:user",
    sortable: true,
    days: 7
  });

  const { data: containers, isLoading: containersLoading, refetch: refetchContainers } = useQuery({
    queryKey: ['containers'],
    queryFn: () => client?.getContainers() || [],
    enabled: !!client,
    refetchInterval: 10000,
  });

  const { data: workflows, isLoading: workflowsLoading, refetch: refetchWorkflows, error: workflowsError } = useQuery({
    queryKey: ['workflows', workflowFilters],
    queryFn: async () => {
      if (!client) return [];
      try {
        return await client.getWorkflows(workflowFilters);
      } catch (error: any) {
        console.error('Failed to fetch workflows:', error);
        throw error;
      }
    },
    enabled: !!client,
    refetchInterval: 10000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: processes, isLoading: processesLoading, refetch: refetchProcesses } = useQuery({
    queryKey: ['processes'],
    queryFn: () => client?.getProcesses() || [],
    enabled: !!client,
    refetchInterval: 5000,
  });

  const { data: systemStats } = useQuery({
    queryKey: ['systemStats'],
    queryFn: () => client?.getSystemStats() || null,
    enabled: !!client,
    refetchInterval: 10000,
  });

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

  const getStatusColor = (status: string) => {
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

  const filteredContainers = containers?.filter(container => 
    statusFilter === 'all' || container.status.toLowerCase().includes(statusFilter.toLowerCase())
  ) || [];

  const filteredWorkflows = workflows?.filter(workflow => 
    statusFilter === 'all' || workflow.status.toLowerCase().includes(statusFilter.toLowerCase())
  ) || [];

  const filteredProcesses = processes?.filter(process => 
    statusFilter === 'all' || process.status === statusFilter
  ) || [];

  const handleKillContainer = async (containerId: string) => {
    if (client && window.confirm('Are you sure you want to kill this container?')) {
      try {
        await client.killContainer(containerId);
        refetchContainers();
      } catch (error) {
        console.error('Failed to kill container:', error);
      }
    }
  };

  const getContainerName = (container: XnatContainer): string => {
    return container['parent-source-object-name'] || 
           container['docker-image']?.split('/').pop()?.split(':')[0] || 
           `Container ${container.id}`;
  };

  const getWorkflowName = (workflow: XnatWorkflow): string => {
    return workflow['step-description'] || workflow['pipeline-name'] || `Workflow ${workflow.id}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Processing & Jobs
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor running containers, workflows, and system performance in real-time.
        </p>
      </div>

      {/* System Stats Overview */}
      {systemStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Cpu className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {systemStats.cpu_usage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">CPU Usage</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <MonitorSpeaker className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {((systemStats.memory_usage / systemStats.memory_total) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  Memory ({systemStats.memory_usage.toFixed(1)}GB)
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <HardDrive className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {((systemStats.disk_usage / systemStats.disk_total) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  Disk ({systemStats.disk_usage.toFixed(1)}TB)
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {systemStats.active_jobs}
                </div>
                <div className="text-xs text-gray-500">Active Jobs</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <Server className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  v{systemStats.version}
                </div>
                <div className="text-xs text-gray-500">XNAT Version</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('jobs')}
            className={clsx(
              'whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium',
              selectedTab === 'jobs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Zap className="h-4 w-4 inline mr-2" />
            Containers ({containers?.length || 0}) / Workflows ({workflows?.length || 0})
          </button>
          <button
            onClick={() => setSelectedTab('processes')}
            className={clsx(
              'whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium',
              selectedTab === 'processes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Server className="h-4 w-4 inline mr-2" />
            Processes ({processes?.length || 0})
          </button>
          <button
            onClick={() => setSelectedTab('system')}
            className={clsx(
              'whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium',
              selectedTab === 'system'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            System
          </button>
        </nav>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Filter className="h-4 w-4 text-gray-400 mr-2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="active">Active</option>
              <option value="queued">Queued</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="error">Error</option>
              <option value="cancelled">Cancelled</option>
              <option value="idle">Idle</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>
          
          {selectedTab === 'jobs' && (
            <>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <select
                  value={workflowFilters.days}
                  onChange={(e) => setWorkflowFilters({...workflowFilters, days: parseInt(e.target.value)})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value={1}>Last 1 day</option>
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Filter by ID..."
                  value={workflowFilters.id}
                  onChange={(e) => setWorkflowFilters({...workflowFilters, id: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={() => {
            if (selectedTab === 'jobs') {
              refetchContainers();
              refetchWorkflows();
            }
            if (selectedTab === 'processes') refetchProcesses();
          }}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Content based on selected tab */}
      {selectedTab === 'jobs' && (
        <div className="space-y-6">
          {/* Containers Section */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Container Executions
              </h3>
              
              {containersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse border rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-4 w-4 bg-gray-200 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredContainers.length === 0 ? (
                <div className="text-center py-8">
                  <Server className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900">No containers found</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {statusFilter !== 'all' ? 'No containers match the selected filter.' : 'No container executions are currently running.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredContainers.map((container) => (
                    <div key={container.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(container.status)}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{getContainerName(container)}</h4>
                            <p className="text-sm text-gray-500">
                              {container['docker-image']} • {container['user-id']}
                              {container['project-id'] && ` • ${container['project-id']}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className={clsx(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              getStatusColor(container.status)
                            )}>
                              {container.status}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Started: {new Date(container.created).toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedContainer(container)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            
                            {(container.status.toLowerCase() === 'running' || container.status.toLowerCase() === 'created') && (
                              <button
                                onClick={() => handleKillContainer(container.id)}
                                className="p-1 text-red-400 hover:text-red-600"
                                title="Kill Container"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {container['container-id'] && (
                        <div className="mt-2 text-xs text-gray-500">
                          Container ID: {container['container-id'].substring(0, 12)}
                        </div>
                      )}
                      
                      {container['command-line'] && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono">
                            {container['command-line'].length > 100 
                              ? `${container['command-line'].substring(0, 100)}...` 
                              : container['command-line']}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Status Time: {new Date(container['status-time']).toLocaleString()}
                        </div>
                        {container.history.length > 0 && (
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Last Update: {container.history[container.history.length - 1]['entity-type']}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Workflows Section */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Workflow Executions
              </h3>
              
              {workflowsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse border rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-4 w-4 bg-gray-200 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : workflowsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900">Error loading workflows</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {workflowsError?.message || 'Unable to fetch workflow data. Please check your connection or try refreshing.'}
                  </p>
                  <button
                    onClick={() => refetchWorkflows()}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </button>
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900">No workflows found</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {statusFilter !== 'all' || workflowFilters.id !== '' ? 
                      'No workflows match the selected filters.' : 
                      'No workflow executions found for the selected time period.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWorkflows.map((workflow) => (
                    <div key={workflow.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(workflow.status)}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{getWorkflowName(workflow)}</h4>
                            <p className="text-sm text-gray-500">
                              {workflow['pipeline-name']} • {workflow['data-type']}
                              {workflow.category && ` • ${workflow.category}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className={clsx(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              getStatusColor(workflow.status)
                            )}>
                              {workflow.status}
                            </div>
                            {workflow.percent_complete !== undefined && (
                              <div className="text-xs text-gray-500 mt-1">
                                {workflow.percent_complete}% complete
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => setSelectedWorkflow(workflow)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {workflow.percent_complete !== undefined && workflow.percent_complete > 0 && (
                        <div className="mt-3">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${workflow.percent_complete}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Started: {new Date(workflow.launch_time).toLocaleString()}
                        </div>
                        {workflow.current_step_launch_time && (
                          <div className="flex items-center">
                            <Activity className="h-3 w-3 mr-1" />
                            Current Step: {new Date(workflow.current_step_launch_time).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'processes' && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              System Processes
            </h3>
            
            {processesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse border rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-4 w-4 bg-gray-200 rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProcesses.length === 0 ? (
              <div className="text-center py-8">
                <Server className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900">No processes found</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {statusFilter !== 'all' ? 'No processes match the selected filter.' : 'No processes are currently running.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProcesses.map((process) => (
                  <div key={process.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(process.status)}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{process.name}</h4>
                          <p className="text-sm text-gray-500">
                            {process.type} • {process.user}
                            {process.project && ` • ${process.project}`}
                          </p>
                          {process.description && (
                            <p className="text-xs text-gray-400 mt-1">{process.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className={clsx(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            getStatusColor(process.status)
                          )}>
                            {process.status}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setSelectedProcess(process)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'system' && systemStats && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
              System Performance
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                    <span className="text-sm text-gray-500">{systemStats.cpu_usage.toFixed(1)}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className={clsx(
                        'h-3 rounded-full transition-all duration-300',
                        systemStats.cpu_usage > 80 ? 'bg-red-500' : 
                        systemStats.cpu_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      )}
                      style={{ width: `${Math.min(systemStats.cpu_usage, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                    <span className="text-sm text-gray-500">
                      {systemStats.memory_usage.toFixed(1)}GB / {systemStats.memory_total.toFixed(1)}GB
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className={clsx(
                        'h-3 rounded-full transition-all duration-300',
                        (systemStats.memory_usage / systemStats.memory_total) > 0.8 ? 'bg-red-500' : 
                        (systemStats.memory_usage / systemStats.memory_total) > 0.6 ? 'bg-yellow-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${(systemStats.memory_usage / systemStats.memory_total) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Disk Usage</span>
                    <span className="text-sm text-gray-500">
                      {systemStats.disk_usage.toFixed(1)}TB / {systemStats.disk_total.toFixed(1)}TB
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className={clsx(
                        'h-3 rounded-full transition-all duration-300',
                        (systemStats.disk_usage / systemStats.disk_total) > 0.9 ? 'bg-red-500' : 
                        (systemStats.disk_usage / systemStats.disk_total) > 0.75 ? 'bg-yellow-500' : 'bg-purple-500'
                      )}
                      style={{ width: `${(systemStats.disk_usage / systemStats.disk_total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {systemStats.active_jobs}
                  </div>
                  <div className="text-sm text-gray-500">Active Jobs</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {systemStats.queued_jobs}
                  </div>
                  <div className="text-sm text-gray-500">Queued Jobs</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {systemStats.active_processes}
                  </div>
                  <div className="text-sm text-gray-500">Processes</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    v{systemStats.version}
                  </div>
                  <div className="text-sm text-gray-500">XNAT Version</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Container Detail Modal */}
      {selectedContainer && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Container Details</h3>
              <button
                onClick={() => setSelectedContainer(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Container Name</div>
                  <div className="text-sm text-gray-900">{getContainerName(selectedContainer)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Status</div>
                  <div className="flex items-center">
                    {getStatusIcon(selectedContainer.status)}
                    <span className="ml-2 text-sm text-gray-900">{selectedContainer.status}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Docker Image</div>
                  <div className="text-sm text-gray-900">{selectedContainer['docker-image']}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">User</div>
                  <div className="text-sm text-gray-900">{selectedContainer['user-id']}</div>
                </div>
                {selectedContainer['project-id'] && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">Project</div>
                    <div className="text-sm text-gray-900">{selectedContainer['project-id']}</div>
                  </div>
                )}
                {selectedContainer['container-id'] && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">Container ID</div>
                    <div className="text-sm text-gray-900 font-mono">{selectedContainer['container-id'].substring(0, 12)}</div>
                  </div>
                )}
              </div>
              
              {selectedContainer['command-line'] && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Command Line</div>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md font-mono">
                    {selectedContainer['command-line']}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Timestamps</div>
                <div className="space-y-1 text-sm">
                  <div>Created: {new Date(selectedContainer.created).toLocaleString()}</div>
                  <div>Status Time: {new Date(selectedContainer['status-time']).toLocaleString()}</div>
                </div>
              </div>

              {selectedContainer.history.length > 0 && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Status History</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedContainer.history.slice(-5).map((entry, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{entry.status}</span>
                          <span className="text-gray-500">{entry['entity-type']}</span>
                        </div>
                        <div className="text-gray-600">
                          {new Date(entry['time-recorded']).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Workflow Details</h3>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Workflow Name</div>
                  <div className="text-sm text-gray-900">{getWorkflowName(selectedWorkflow)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Status</div>
                  <div className="flex items-center">
                    {getStatusIcon(selectedWorkflow.status)}
                    <span className="ml-2 text-sm text-gray-900">{selectedWorkflow.status}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Pipeline</div>
                  <div className="text-sm text-gray-900">{selectedWorkflow['pipeline-name']}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Data Type</div>
                  <div className="text-sm text-gray-900">{selectedWorkflow['data-type']}</div>
                </div>
                {selectedWorkflow.category && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">Category</div>
                    <div className="text-sm text-gray-900">{selectedWorkflow.category}</div>
                  </div>
                )}
                {selectedWorkflow.percent_complete !== undefined && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">Progress</div>
                    <div className="text-sm text-gray-900">{selectedWorkflow.percent_complete}%</div>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Timestamps</div>
                <div className="space-y-1 text-sm">
                  <div>Launch Time: {new Date(selectedWorkflow.launch_time).toLocaleString()}</div>
                  {selectedWorkflow.current_step_launch_time && (
                    <div>Current Step: {new Date(selectedWorkflow.current_step_launch_time).toLocaleString()}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}