import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertCircle,
  Cpu,
  Filter,
  Package,
  Play,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatCommand, XnatCommandWrapper } from '../services/xnat-api';

// Helper to build launch URL with all context params preserved
function buildLaunchUrl(wrapperId: number, project: string, urlParams: URLSearchParams): string {
  const params = new URLSearchParams();
  params.set('wrapperId', String(wrapperId));

  // Add project if available
  if (project) {
    params.set('project', project);
  }

  // Preserve all URL params from command browser (session, subject, etc.)
  urlParams.forEach((value, key) => {
    // Don't overwrite wrapperId or duplicate project
    if (key !== 'wrapperId' && !(key === 'project' && project)) {
      params.set(key, value);
    }
  });

  return params.toString();
}

export function CommandBrowser() {
  const { client } = useXnat();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedXsiType, setSelectedXsiType] = useState<string>('');
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

  // Preserve all URL params for passing to launch page
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const commandsQuery = useQuery({
    queryKey: ['commands'],
    enabled: !!client,
    queryFn: async () => {
      const result = await client?.getCommands() || [];
      console.log('📦 Commands API Response:', result);
      return result;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    enabled: !!client,
    queryFn: () => client?.getProjects() || [],
  });

  const commands = commandsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  const xsiTypes = useMemo(() => {
    const types = new Set<string>();
    commands.forEach((command) => {
      const wrappers = command.xnat ?? command['xnat-command-wrappers'] ?? command.xnatCommandWrappers ?? [];
      wrappers.forEach((wrapper: XnatCommandWrapper) => {
        const contexts = wrapper.contexts ?? [];
        contexts.forEach((context) => types.add(context));
      });
    });
    return Array.from(types).sort();
  }, [commands]);

  const filteredCommands = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return commands.filter((command) => {
      if (query && !command.name.toLowerCase().includes(query) && !command.image.toLowerCase().includes(query)) {
        return false;
      }
      if (selectedXsiType) {
        const wrappers = command.xnat ?? command['xnat-command-wrappers'] ?? command.xnatCommandWrappers ?? [];
        const hasMatchingContext = wrappers.some((wrapper: XnatCommandWrapper) => {
          const contexts = wrapper.contexts ?? [];
          return contexts.includes(selectedXsiType);
        });
        if (!hasMatchingContext) return false;
      }
      return true;
    });
  }, [commands, searchQuery, selectedXsiType]);

  const refreshData = () => {
    commandsQuery.refetch();
    projectsQuery.refetch();
  };

  if (!client) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-lg bg-yellow-50 p-6 text-sm text-yellow-800 max-w-md text-center">
          <p className="font-medium">You are not connected to an XNAT server.</p>
          <p className="mt-2">Sign in through the portal to browse commands.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Command Browser
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse and search available container commands for data processing.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands by name or image..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={refreshData}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RefreshCw className={clsx('mr-2 h-4 w-4', { 'animate-spin': commandsQuery.isFetching })} />
              Refresh
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Filter by Context Type
              </label>
              <select
                value={selectedXsiType}
                onChange={(e) => setSelectedXsiType(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All types</option>
                {xsiTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Filter by Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All projects (site-wide)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name || project.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyEnabled}
                  onChange={(e) => setShowOnlyEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enabled only</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Available Commands</h2>
            <div className="text-sm text-gray-500">
              {filteredCommands.length} command{filteredCommands.length === 1 ? '' : 's'}
            </div>
          </div>

          {commandsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-md border border-gray-200 bg-gray-50 p-4">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : commandsQuery.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Unable to load commands.{' '}
                  {commandsQuery.error instanceof Error ? commandsQuery.error.message : 'Please try refreshing.'}
                </span>
              </div>
            </div>
          ) : filteredCommands.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No commands found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCommands.map((command) => (
                <CommandCard key={command.id} command={command} selectedProject={selectedProject} urlParams={urlParams} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommandCardProps {
  command: XnatCommand;
  selectedProject: string;
  urlParams: URLSearchParams;
}

function CommandCard({ command, selectedProject, urlParams }: CommandCardProps) {
  const [expanded, setExpanded] = useState(false);
  const wrappers = command.xnat ?? command['xnat-command-wrappers'] ?? command.xnatCommandWrappers ?? [];

  console.log(`🔍 Command "${command.name}":`, {
    'xnat': command.xnat,
    'xnat-command-wrappers': command['xnat-command-wrappers'],
    'xnatCommandWrappers': command.xnatCommandWrappers,
    'wrappers count': wrappers.length,
    'all keys': Object.keys(command)
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600 shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900">{command.name}</h3>
              <span className="text-sm text-gray-500">v{command.version}</span>
            </div>
            {command.description && (
              <p className="mt-1 text-sm text-gray-600">{command.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">{command.image}</code>
              </div>
              {wrappers.length > 0 && (
                <div className="flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  <span>{wrappers.length} wrapper{wrappers.length === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              {expanded ? 'Hide' : 'Show'} Details
            </button>
          </div>
        </div>

        {expanded && wrappers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Command Wrappers</h4>
            <div className="space-y-2">
              {wrappers.map((wrapper: XnatCommandWrapper) => (
                <div
                  key={wrapper.id}
                  className="rounded-md border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{wrapper.name}</div>
                      {wrapper.description && (
                        <div className="text-xs text-gray-600 mt-1">{wrapper.description}</div>
                      )}
                      {wrapper.contexts && wrapper.contexts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {wrapper.contexts.map((context) => (
                            <span
                              key={context}
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {context}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/processing/launch?${buildLaunchUrl(wrapper.id, selectedProject, urlParams)}`}
                      className="ml-4 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Play className="h-3 w-3" />
                      Launch
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommandBrowser;
