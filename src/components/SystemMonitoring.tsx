import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Cpu,
  Database,
  ExternalLink,
  HardDrive,
  Layers,
  MemoryStick,
  RefreshCw,
  Server,
  Zap
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';

interface SystemInfo {
  javaVersion?: string;
  jvmVersion?: string;
  server?: string;
  startTime?: string;
  sessionMeanAge?: number;
  javaMemoryUsed?: number;
  javaMemoryTotal?: number;
  systemLoad?: number;
  freePhysicalMemory?: number;
  totalPhysicalMemory?: number;
  freeDiskSpace?: number;
  usableDiskSpace?: number;
  nonHeapMemory?: number;
  loadedClasses?: number;
  gcTime?: number;
  processCpuTime?: number;

  // Additional system information
  host?: string;
  os?: string;
  processors?: number;
  serverInfo?: string;
  contextPath?: string;
  serverPort?: string;
  javaMaxMemory?: number;
  javaFreeMemory?: number;
  pid?: string;
  systemCpuLoad?: number;
  unixOpenFileDescriptors?: number;
  unixMaxFileDescriptors?: number;
  availableProcessors?: number;
  threadCount?: number;
  peakThreadCount?: number;
  totalStartedThreadCount?: number;
  activeSessionsCount?: number;
}

export function SystemMonitoring() {
  const { client } = useXnat();
  const [selectedGraph, setSelectedGraph] = useState<string | null>(null);

  // In dev mode, use /api/xnat prefix for proxy; in production, use direct path
  const isDev = import.meta.env.DEV;
  const monitoringPath = isDev ? '/api/xnat/monitoring' : '/monitoring';

  const { data: systemInfo, isLoading, refetch } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      if (!client) return null;

      // Fetch the monitoring HTML page directly using the XNAT client (goes through proxy in dev)
      try {
        const response = await client.getHttpClient().get('/monitoring', {
          headers: { 'Accept': 'text/html' }
        });

        if (!response.data || typeof response.data !== 'string') {
          console.error('Invalid monitoring page response');
          return null;
        }

        const html = response.data;

        const info: SystemInfo = {};

        // Extract Java version
        const javaMatch = html.match(/Java:\s*<\/td><td>(.*?)<\/td>/i);
        if (javaMatch) info.javaVersion = javaMatch[1].replace(/<[^>]*>/g, '');

        // Extract JVM
        const jvmMatch = html.match(/JVM:\s*<\/td><td>(.*?)<\/td>/i);
        if (jvmMatch) info.jvmVersion = jvmMatch[1].replace(/<[^>]*>/g, '').split(',')[0];

        // Extract Server
        const serverMatch = html.match(/Apache Tomcat\/([\d.]+)/i);
        if (serverMatch) info.server = `Apache Tomcat ${serverMatch[1]}`;

        // Extract Start time
        const startMatch = html.match(/Start:\s*<\/td><td>(.*?)<\/td>/i);
        if (startMatch) info.startTime = startMatch[1];

        // Extract Session mean age
        const sessionMatch = html.match(/Mean age of http sessions.*?<\/em>(\d+)<\/a>/i);
        if (sessionMatch) info.sessionMeanAge = parseInt(sessionMatch[1], 10);

        // Extract memory values
        const memMatch = html.match(/Java memory used:.*?<\/em>(\d[\d,]*)<\/a>\s*Mb\s*\/\s*(\d[\d,]*)\s*Mb/i);
        if (memMatch) {
          info.javaMemoryUsed = parseFloat(memMatch[1].replace(/,/g, ''));
          info.javaMemoryTotal = parseFloat(memMatch[2].replace(/,/g, ''));
        }

        // Extract system load
        const loadMatch = html.match(/System load<\/td><td>.*?<\/em>(\d+\.?\d*)<\/a>/i);
        if (loadMatch) info.systemLoad = parseFloat(loadMatch[1]);

        // Extract physical memory
        const freePhysMatch = html.match(/Free physical memory\s*=\s*(\d[\d,]*)\s*Mb/i);
        const totalPhysMatch = html.match(/Total physical memory\s*=\s*(\d[\d,]*)\s*Mb/i);
        if (freePhysMatch) info.freePhysicalMemory = parseFloat(freePhysMatch[1].replace(/,/g, ''));
        if (totalPhysMatch) info.totalPhysicalMemory = parseFloat(totalPhysMatch[1].replace(/,/g, ''));

        // Extract disk space
        const freeDiskMatch = html.match(/Free disk space:\s*<\/td><td>(\d[\d,]*)\s*Mb/i);
        const usableDiskMatch = html.match(/Usable disk space:\s*<\/td><td>(\d[\d,]*)\s*Mb/i);
        if (freeDiskMatch) info.freeDiskSpace = parseFloat(freeDiskMatch[1].replace(/,/g, ''));
        if (usableDiskMatch) info.usableDiskSpace = parseFloat(usableDiskMatch[1].replace(/,/g, ''));

        // Extract other metrics
        const nonHeapMatch = html.match(/Non heap memory\s*=\s*(\d+)\s*Mb/i);
        if (nonHeapMatch) info.nonHeapMemory = parseInt(nonHeapMatch[1], 10);

        const classesMatch = html.match(/Loaded classes\s*=\s*([\d,]+)/i);
        if (classesMatch) info.loadedClasses = parseInt(classesMatch[1].replace(/,/g, ''), 10);

        const gcMatch = html.match(/Garbage collection time\s*=\s*([\d,]+)\s*ms/i);
        if (gcMatch) info.gcTime = parseInt(gcMatch[1].replace(/,/g, ''), 10);

        const cpuTimeMatch = html.match(/Process cpu time\s*=\s*([\d,]+)\s*ms/i);
        if (cpuTimeMatch) info.processCpuTime = parseInt(cpuTimeMatch[1].replace(/,/g, ''), 10);

        // Extract additional system information
        const hostMatch = html.match(/Host:\s*<\/td><td>(.*?)<\/td>/i);
        if (hostMatch) info.host = hostMatch[1].replace(/<[^>]*>/g, '').trim();

        const osMatch = html.match(/OS:\s*<\/td><td>(.*?)<\/td>/i);
        if (osMatch) info.os = osMatch[1].replace(/<[^>]*>/g, '').trim();

        const processorsMatch = html.match(/Available processors:\s*<\/td><td>(\d+)/i);
        if (processorsMatch) info.processors = parseInt(processorsMatch[1], 10);

        const serverInfoMatch = html.match(/Server info:\s*<\/td><td>(.*?)<\/td>/i);
        if (serverInfoMatch) info.serverInfo = serverInfoMatch[1].replace(/<[^>]*>/g, '').trim();

        const contextPathMatch = html.match(/Context path:\s*<\/td><td>(.*?)<\/td>/i);
        if (contextPathMatch) info.contextPath = contextPathMatch[1].replace(/<[^>]*>/g, '').trim();

        const pidMatch = html.match(/PID:\s*<\/td><td>(.*?)<\/td>/i);
        if (pidMatch) info.pid = pidMatch[1].replace(/<[^>]*>/g, '').trim();

        const threadCountMatch = html.match(/Thread count:\s*<\/td><td>.*?<\/em>(\d+)<\/a>/i);
        if (threadCountMatch) info.threadCount = parseInt(threadCountMatch[1], 10);

        const peakThreadMatch = html.match(/Peak thread count:\s*<\/td><td>.*?<\/em>(\d+)<\/a>/i);
        if (peakThreadMatch) info.peakThreadCount = parseInt(peakThreadMatch[1], 10);

        const totalThreadsMatch = html.match(/Total started thread count:\s*<\/td><td>.*?<\/em>([\d,]+)<\/a>/i);
        if (totalThreadsMatch) info.totalStartedThreadCount = parseInt(totalThreadsMatch[1].replace(/,/g, ''), 10);

        const activeSessionsMatch = html.match(/Active sessions:\s*<\/td><td>.*?<\/em>(\d+)<\/a>/i);
        if (activeSessionsMatch) info.activeSessionsCount = parseInt(activeSessionsMatch[1], 10);

        const systemCpuMatch = html.match(/System cpu load:\s*<\/td><td>.*?<\/em>(\d+\.?\d*)<\/a>/i);
        if (systemCpuMatch) info.systemCpuLoad = parseFloat(systemCpuMatch[1]);

        const openFdMatch = html.match(/Unix open file descriptors:\s*<\/td><td>.*?<\/em>(\d+)<\/a>/i);
        if (openFdMatch) info.unixOpenFileDescriptors = parseInt(openFdMatch[1], 10);

        const maxFdMatch = html.match(/Unix max file descriptors:\s*<\/td><td>.*?<\/em>([\d,]+)<\/a>/i);
        if (maxFdMatch) info.unixMaxFileDescriptors = parseInt(maxFdMatch[1].replace(/,/g, ''), 10);

        return info;
      } catch (err) {
        console.error('Failed to fetch system info:', err);
        return null;
      }
    },
    enabled: !!client,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const graphs = [
    { id: 'usedMemory', title: 'Java Memory Used', category: 'Memory' },
    { id: 'cpu', title: 'CPU Usage %', category: 'CPU' },
    { id: 'systemLoad', title: 'System Load', category: 'CPU' },
    { id: 'systemCpuLoad', title: 'System CPU %', category: 'CPU' },
    { id: 'httpSessions', title: 'HTTP Sessions', category: 'HTTP' },
    { id: 'activeThreads', title: 'Active Threads', category: 'Threads' },
    { id: 'threadCount', title: 'Thread Count', category: 'Threads' },
    { id: 'activeConnections', title: 'Active JDBC Connections', category: 'Database' },
    { id: 'usedConnections', title: 'Used JDBC Connections', category: 'Database' },
    { id: 'httpHitsRate', title: 'HTTP Hits/min', category: 'HTTP' },
    { id: 'httpMeanTimes', title: 'HTTP Mean Time (ms)', category: 'HTTP' },
    { id: 'httpSystemErrors', title: 'HTTP Errors %', category: 'HTTP' },
    { id: 'sqlHitsRate', title: 'SQL Hits/min', category: 'Database' },
    { id: 'sqlMeanTimes', title: 'SQL Mean Time (ms)', category: 'Database' },
    { id: 'sqlSystemErrors', title: 'SQL Errors %', category: 'Database' },
    { id: 'gc', title: 'Garbage Collector %', category: 'Memory' },
    { id: 'loadedClassesCount', title: 'Loaded Classes', category: 'JVM' },
    { id: 'usedNonHeapMemory', title: 'Non-Heap Memory', category: 'Memory' },
    { id: 'usedPhysicalMemorySize', title: 'Physical Memory', category: 'Memory' },
    { id: 'usedSwapSpaceSize', title: 'Swap Space', category: 'Memory' },
    { id: 'Free_disk_space', title: 'Free Disk Space', category: 'Disk' },
    { id: 'Usable_disk_space', title: 'Usable Disk Space', category: 'Disk' },
    { id: 'tomcatBusyThreads', title: 'Tomcat Busy Threads', category: 'Tomcat' },
    { id: 'tomcatBytesReceived', title: 'Bytes Received/min', category: 'Tomcat' },
    { id: 'tomcatBytesSent', title: 'Bytes Sent/min', category: 'Tomcat' },
  ];

  const categories = Array.from(new Set(graphs.map(g => g.category)));

  const formatMB = (mb?: number) => mb ? `${mb.toLocaleString()} MB` : 'N/A';
  const formatNumber = (num?: number) => num ? num.toLocaleString() : 'N/A';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const memoryUsedPercent = systemInfo?.javaMemoryUsed && systemInfo?.javaMemoryTotal
    ? (systemInfo.javaMemoryUsed / systemInfo.javaMemoryTotal * 100).toFixed(1)
    : '0';

  const physicalMemoryUsedPercent = systemInfo?.freePhysicalMemory && systemInfo?.totalPhysicalMemory
    ? ((1 - systemInfo.freePhysicalMemory / systemInfo.totalPhysicalMemory) * 100).toFixed(1)
    : '0';

  const diskUsedPercent = systemInfo?.freeDiskSpace && systemInfo?.usableDiskSpace
    ? ((1 - systemInfo.freeDiskSpace / systemInfo.usableDiskSpace) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">Real-time performance metrics from JavaMelody</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => window.open(monitoringPath, '_blank')}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Full Dashboard
          </button>
        </div>
      </div>

      {/* System Info Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-5 shadow-lg sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MemoryStick className="h-8 w-8 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-blue-100">Java Memory</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-white">{memoryUsedPercent}%</dd>
                <dd className="mt-1 text-xs text-blue-100">
                  {formatMB(systemInfo?.javaMemoryUsed)} / {formatMB(systemInfo?.javaMemoryTotal)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-gradient-to-br from-green-500 to-green-600 px-4 py-5 shadow-lg sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Cpu className="h-8 w-8 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-green-100">System Load</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-white">
                  {systemInfo?.systemLoad?.toFixed(2) || 'N/A'}
                </dd>
                <dd className="mt-1 text-xs text-green-100">Load average</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 px-4 py-5 shadow-lg sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <HardDrive className="h-8 w-8 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-purple-100">Physical Memory</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-white">{physicalMemoryUsedPercent}%</dd>
                <dd className="mt-1 text-xs text-purple-100">
                  {formatMB(systemInfo?.freePhysicalMemory)} free
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-5 shadow-lg sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Server className="h-8 w-8 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-orange-100">Disk Space</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-white">{diskUsedPercent}%</dd>
                <dd className="mt-1 text-xs text-orange-100">
                  {formatMB(systemInfo?.freeDiskSpace)} free
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* System Details */}
      {systemInfo && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">System Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start">
              <Layers className="mt-0.5 h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Java Version</p>
                <p className="mt-1 text-sm text-gray-900">{systemInfo.javaVersion || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Zap className="mt-0.5 h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">JVM</p>
                <p className="mt-1 text-sm text-gray-900">{systemInfo.jvmVersion || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Server className="mt-0.5 h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Server</p>
                <p className="mt-1 text-sm text-gray-900">{systemInfo.server || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Activity className="mt-0.5 h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Started</p>
                <p className="mt-1 text-sm text-gray-900">{systemInfo.startTime || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Database className="mt-0.5 h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Loaded Classes</p>
                <p className="mt-1 text-sm text-gray-900">{formatNumber(systemInfo.loadedClasses)}</p>
              </div>
            </div>
            <div className="flex items-start">
              <MemoryStick className="mt-0.5 h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Non-Heap Memory</p>
                <p className="mt-1 text-sm text-gray-900">{formatMB(systemInfo.nonHeapMemory)}</p>
              </div>
            </div>
            {systemInfo.host && (
              <div className="flex items-start">
                <Server className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Host</p>
                  <p className="mt-1 text-sm text-gray-900">{systemInfo.host}</p>
                </div>
              </div>
            )}
            {systemInfo.os && (
              <div className="flex items-start">
                <Server className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Operating System</p>
                  <p className="mt-1 text-sm text-gray-900">{systemInfo.os}</p>
                </div>
              </div>
            )}
            {systemInfo.processors && (
              <div className="flex items-start">
                <Cpu className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Processors</p>
                  <p className="mt-1 text-sm text-gray-900">{systemInfo.processors}</p>
                </div>
              </div>
            )}
            {systemInfo.pid && (
              <div className="flex items-start">
                <Activity className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Process ID</p>
                  <p className="mt-1 text-sm text-gray-900">{systemInfo.pid}</p>
                </div>
              </div>
            )}
            {systemInfo.threadCount !== undefined && (
              <div className="flex items-start">
                <Activity className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Active Threads</p>
                  <p className="mt-1 text-sm text-gray-900">{formatNumber(systemInfo.threadCount)}</p>
                </div>
              </div>
            )}
            {systemInfo.peakThreadCount && (
              <div className="flex items-start">
                <Activity className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Peak Threads</p>
                  <p className="mt-1 text-sm text-gray-900">{formatNumber(systemInfo.peakThreadCount)}</p>
                </div>
              </div>
            )}
            {systemInfo.totalStartedThreadCount && (
              <div className="flex items-start">
                <Activity className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Started Threads</p>
                  <p className="mt-1 text-sm text-gray-900">{formatNumber(systemInfo.totalStartedThreadCount)}</p>
                </div>
              </div>
            )}
            {systemInfo.activeSessionsCount !== undefined && (
              <div className="flex items-start">
                <Activity className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Active HTTP Sessions</p>
                  <p className="mt-1 text-sm text-gray-900">{formatNumber(systemInfo.activeSessionsCount)}</p>
                </div>
              </div>
            )}
            {systemInfo.systemCpuLoad !== undefined && (
              <div className="flex items-start">
                <Cpu className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">System CPU Load</p>
                  <p className="mt-1 text-sm text-gray-900">{(systemInfo.systemCpuLoad * 100).toFixed(1)}%</p>
                </div>
              </div>
            )}
            {systemInfo.unixOpenFileDescriptors !== undefined && (
              <div className="flex items-start">
                <HardDrive className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Open File Descriptors</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatNumber(systemInfo.unixOpenFileDescriptors)}
                    {systemInfo.unixMaxFileDescriptors && ` / ${formatNumber(systemInfo.unixMaxFileDescriptors)}`}
                  </p>
                </div>
              </div>
            )}
            {systemInfo.gcTime && (
              <div className="flex items-start">
                <Activity className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">GC Time</p>
                  <p className="mt-1 text-sm text-gray-900">{formatNumber(systemInfo.gcTime)} ms</p>
                </div>
              </div>
            )}
            {systemInfo.processCpuTime && (
              <div className="flex items-start">
                <Cpu className="mt-0.5 h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Process CPU Time</p>
                  <p className="mt-1 text-sm text-gray-900">{formatNumber(systemInfo.processCpuTime)} ms</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Graphs by Category */}
      {categories.map(category => (
        <div key={category} className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{category} Metrics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {graphs
              .filter(g => g.category === category)
              .map(graph => (
                <div
                  key={graph.id}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3 transition-all hover:border-blue-500 hover:shadow-md"
                  onClick={() => setSelectedGraph(graph.id)}
                >
                  <h3 className="mb-2 text-sm font-medium text-gray-700 group-hover:text-blue-600">
                    {graph.title}
                  </h3>
                  <img
                    src={`${monitoringPath}?width=300&height=150&graph=${graph.id}`}
                    alt={graph.title}
                    className="w-full rounded"
                    loading="lazy"
                  />
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Expanded Graph Modal */}
      {selectedGraph && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setSelectedGraph(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-6xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedGraph(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {graphs.find(g => g.id === selectedGraph)?.title}
            </h2>
            <img
              src={`${monitoringPath}?width=1200&height=600&graph=${selectedGraph}`}
              alt={graphs.find(g => g.id === selectedGraph)?.title}
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
