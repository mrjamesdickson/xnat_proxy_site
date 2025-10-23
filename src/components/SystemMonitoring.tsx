import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, HardDrive, MemoryStick, RefreshCw, Server } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatSystemMonitoring } from '../services/xnat-api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function SystemMonitoring() {
  const { client } = useXnat();
  const [history, setHistory] = useState<Array<XnatSystemMonitoring & { time: string }>>([]);

  const { data: monitoring, isLoading, isError, refetch } = useQuery({
    queryKey: ['system-monitoring'],
    queryFn: () => client?.getSystemMonitoring() || Promise.resolve(null),
    enabled: !!client,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  useEffect(() => {
    if (monitoring) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();

      setHistory((prev) => {
        const updated = [...prev, { ...monitoring, time: timeStr }];
        // Keep last 20 data points
        return updated.slice(-20);
      });
    }
  }, [monitoring]);

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatUptime = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !monitoring) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </button>
        </div>
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Server className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Monitoring Unavailable</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Unable to fetch system monitoring data. This feature may not be enabled on this XNAT server.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cpuUsage = monitoring.cpu?.usage ?? 0;
  const memoryUsed = monitoring.memory?.used ?? 0;
  const memoryTotal = monitoring.memory?.total ?? 0;
  const memoryPercent = monitoring.memory?.usedPercent ?? 0;
  const diskUsed = monitoring.disk?.used ?? 0;
  const diskTotal = monitoring.disk?.total ?? 0;
  const diskPercent = monitoring.disk?.usedPercent ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* CPU Card */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Cpu className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">CPU Usage</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{cpuUsage.toFixed(1)}%</dd>
                {monitoring.cpu?.cores && (
                  <dd className="mt-1 text-xs text-gray-500">{monitoring.cpu.cores} cores</dd>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Memory Card */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MemoryStick className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Memory Usage</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{memoryPercent.toFixed(1)}%</dd>
                <dd className="mt-1 text-xs text-gray-500">
                  {formatBytes(memoryUsed)} / {formatBytes(memoryTotal)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Disk Card */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <HardDrive className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Disk Usage</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{diskPercent.toFixed(1)}%</dd>
                <dd className="mt-1 text-xs text-gray-500">
                  {formatBytes(diskUsed)} / {formatBytes(diskTotal)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Uptime Card */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Server className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Uptime</dt>
                <dd className="mt-1 text-lg font-semibold tracking-tight text-gray-900">
                  {formatUptime(monitoring.uptime)}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* CPU Usage Chart */}
      {history.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">CPU Usage Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cpu.usage" stroke="#3b82f6" name="CPU %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Memory Usage Chart */}
      {history.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Memory Usage Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="memory.usedPercent" stroke="#10b981" name="Memory %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Disk Usage Chart */}
      {history.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Disk Usage Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="disk.usedPercent" stroke="#a855f7" name="Disk %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
