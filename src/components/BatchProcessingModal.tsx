import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Rocket, AlertCircle, CheckCircle, Loader2, Search } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatCommand, XnatCommandWrapper } from '../services/xnat-api';
import clsx from 'clsx';

interface BatchProcessingModalProps {
  selectedExperiments: Set<string>;
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BatchProcessingModal({
  selectedExperiments,
  projectId,
  onClose,
  onSuccess,
}: BatchProcessingModalProps) {
  const { client } = useXnat();
  const [selectedCommand, setSelectedCommand] = useState<XnatCommand | null>(null);
  const [selectedWrapper, setSelectedWrapper] = useState<XnatCommandWrapper | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch available commands
  const { data: commands, isLoading: commandsLoading } = useQuery({
    queryKey: ['commands'],
    queryFn: () => client?.getCommands() || [],
    enabled: !!client,
  });

  // Filter commands to show only experiment-level wrappers
  const experimentCommands = commands?.filter(command => {
    const wrappers = command.xnat || command['xnat-command-wrappers'] || command.xnatCommandWrappers || [];
    return wrappers.some(wrapper => {
      const contexts = wrapper.contexts || wrapper.context || [];
      const contextArray = Array.isArray(contexts) ? contexts : [contexts];
      return contextArray.some(ctx =>
        typeof ctx === 'string' && (
          ctx.includes('imageSessionData') ||
          ctx.includes('mrSessionData') ||
          ctx.includes('Session') ||
          ctx.includes('Experiment')
        )
      );
    });
  });

  // Filter by search term
  const filteredCommands = experimentCommands?.filter(command => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = command.name?.toLowerCase() || '';
    const description = command.description?.toLowerCase() || '';
    return name.includes(search) || description.includes(search);
  });

  const handleSelectCommand = (command: XnatCommand) => {
    setSelectedCommand(command);
    setSelectedWrapper(null);
    setLaunchResult(null);

    // Auto-select wrapper if there's only one experiment-level wrapper
    const wrappers = command.xnat || command['xnat-command-wrappers'] || command.xnatCommandWrappers || [];
    const experimentWrappers = wrappers.filter(wrapper => {
      const contexts = wrapper.contexts || wrapper.context || [];
      const contextArray = Array.isArray(contexts) ? contexts : [contexts];
      return contextArray.some(ctx =>
        typeof ctx === 'string' && (
          ctx.includes('imageSessionData') ||
          ctx.includes('mrSessionData') ||
          ctx.includes('Session') ||
          ctx.includes('Experiment')
        )
      );
    });

    if (experimentWrappers.length === 1) {
      setSelectedWrapper(experimentWrappers[0]);
    }
  };

  const handleLaunch = async () => {
    if (!client || !selectedCommand || !selectedWrapper) return;

    setIsLaunching(true);
    setLaunchResult(null);

    try {
      const wrapperId = selectedWrapper.id || 0;
      const experimentIds = Array.from(selectedExperiments);

      // Use bulk launch API - params should include root-element-values
      const params: Record<string, any> = {
        'root-element-values': experimentIds,
      };

      await client.bulkLaunch(
        wrapperId,
        'Session', // root element type for experiments
        params as Record<string, string>,
        projectId
      );

      setLaunchResult({
        success: true,
        message: `Successfully launched ${selectedCommand.name} on ${experimentIds.length} experiment${experimentIds.length !== 1 ? 's' : ''}`,
      });

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Batch launch failed:', error);
      setLaunchResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to launch containers',
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                  Batch Process Experiments
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedExperiments.size} experiment{selectedExperiments.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search commands..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            {/* Commands List */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Processing Command
              </label>

              {commandsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredCommands && filteredCommands.length > 0 ? (
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                  {filteredCommands.map((command) => {
                    const commandId = command.id || command['command-id'] || 0;
                    const isSelected = selectedCommand?.id === commandId;
                    const keyValue = String(commandId);

                    return (
                      <button
                        key={keyValue}
                        type="button"
                        onClick={() => handleSelectCommand(command)}
                        className={clsx(
                          'w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors',
                          isSelected && 'bg-blue-50 hover:bg-blue-100'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{command.name}</div>
                            {command.description && (
                              <div className="mt-1 text-xs text-gray-500 line-clamp-2">{command.description}</div>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-blue-600 ml-2 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-500">
                  No experiment-level commands found
                </div>
              )}
            </div>

            {/* Selected Command Summary */}
            {selectedCommand && (
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Command</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><span className="font-medium">Name:</span> {selectedCommand.name}</div>
                  {selectedCommand.description && (
                    <div><span className="font-medium">Description:</span> {selectedCommand.description}</div>
                  )}
                  {selectedWrapper && (
                    <div><span className="font-medium">Wrapper:</span> {selectedWrapper.name || 'Default'}</div>
                  )}
                </div>
              </div>
            )}

            {/* Launch Result */}
            {launchResult && (
              <div className={clsx(
                'rounded-md p-4 mb-4',
                launchResult.success ? 'bg-green-50' : 'bg-red-50'
              )}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {launchResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={clsx(
                      'text-sm',
                      launchResult.success ? 'text-green-800' : 'text-red-800'
                    )}>
                      {launchResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
            <button
              type="button"
              onClick={handleLaunch}
              disabled={!selectedCommand || !selectedWrapper || isLaunching}
              className={clsx(
                'inline-flex w-full justify-center items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto',
                (!selectedCommand || !selectedWrapper || isLaunching)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500'
              )}
            >
              {isLaunching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Launch Processing
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLaunching}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
