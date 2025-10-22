import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import { LaunchForm } from './LaunchForm';

export function CommandLauncher() {
  const { client } = useXnat();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const wrapperId = searchParams.get('wrapperId');
  const project = searchParams.get('project') || undefined;
  const rootElement = searchParams.get('rootElement') || 'xnat:imageSessionData';

  const wrapperIdNum = wrapperId ? Number.parseInt(wrapperId, 10) : null;

  const initialParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!['wrapperId', 'project', 'rootElement'].includes(key)) {
        params[key] = value;
      }
    });
    console.log('🔧 CommandLauncher initialParams:', params);
    console.log('🔧 All searchParams:', Object.fromEntries(searchParams.entries()));
    return params;
  }, [searchParams]);

  const commandsQuery = useQuery({
    queryKey: ['commands'],
    enabled: !!client,
    queryFn: () => client?.getCommands() || [],
  });

  const wrapper = useMemo(() => {
    if (!wrapperIdNum || !commandsQuery.data) return null;

    for (const command of commandsQuery.data) {
      const wrappers = command.xnat ?? command['xnat-command-wrappers'] ?? command.xnatCommandWrappers ?? [];
      const found = wrappers.find((w) => w.id === wrapperIdNum);
      if (found) {
        return { command, wrapper: found };
      }
    }
    return null;
  }, [wrapperIdNum, commandsQuery.data]);

  if (!client) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-lg bg-yellow-50 p-6 text-sm text-yellow-800 max-w-md text-center">
          <p className="font-medium">You are not connected to an XNAT server.</p>
          <p className="mt-2">Sign in through the portal to launch containers.</p>
        </div>
      </div>
    );
  }

  if (!wrapperId || wrapperIdNum === null || Number.isNaN(wrapperIdNum)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-sm text-red-800 max-w-md text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <p className="font-medium">Invalid wrapper ID.</p>
          <p className="mt-2">Please select a command from the browser.</p>
          <button
            type="button"
            onClick={() => navigate('/processing/commands')}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Commands
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <button
          type="button"
          onClick={() => navigate('/processing/commands')}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Commands
        </button>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Launch Container
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure and launch a container processing job.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {commandsQuery.isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Loading command information...</p>
            </div>
          </div>
        ) : commandsQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Unable to load command information.</span>
            </div>
          </div>
        ) : !wrapper ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Command wrapper not found.</span>
            </div>
            <p className="mt-2">The specified wrapper ID ({wrapperId}) does not exist.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{wrapper.command.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{wrapper.wrapper.name}</p>
              {wrapper.wrapper.description && (
                <p className="text-sm text-gray-500 mt-2">{wrapper.wrapper.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                <div>
                  <span className="font-medium">Image:</span>{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded">{wrapper.command.image}</code>
                </div>
                <div>
                  <span className="font-medium">Version:</span> {wrapper.command.version}
                </div>
                {project && (
                  <div>
                    <span className="font-medium">Project:</span> {project}
                  </div>
                )}
                <div>
                  <span className="font-medium">Root Element:</span> {rootElement}
                </div>
                {Object.entries(initialParams).map(([key, value]) => {
                  // Skip xsiType as it's just for filtering
                  if (key === 'xsiType') return null;

                  // Extract clean label from archive paths
                  let displayValue = value;
                  if (value.startsWith('/archive/')) {
                    const parts = value.split('/');
                    displayValue = parts[parts.length - 1]; // Show just the ID
                  }

                  return (
                    <div key={key}>
                      <span className="font-medium capitalize">{key.replace(/-/g, ' ')}:</span>{' '}
                      <span className="text-gray-700">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <LaunchForm
              wrapperId={wrapperIdNum}
              project={project}
              rootElement={rootElement}
              initialParams={initialParams}
              onCancel={() => navigate('/processing/commands')}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default CommandLauncher;
