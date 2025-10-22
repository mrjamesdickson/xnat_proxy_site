import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2, Play, Rocket, X } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import { LaunchForm } from './LaunchForm';
import type { XnatCommand, XnatCommandWrapper } from '../services/xnat-api';

export interface ProcessingMenuProps {
  project: string;
  xsiType: string;
  contextParams: Record<string, string>; // e.g., { session: "/archive/experiments/XNAT_E00498" }
  rootElement: string;
  label?: string; // Optional label for display (e.g., session label)
}

export function ProcessingMenu({ project, xsiType, contextParams, rootElement, label }: ProcessingMenuProps) {
  const { client } = useXnat();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWrapper, setSelectedWrapper] = useState<{
    command: XnatCommand;
    wrapper: XnatCommandWrapper;
  } | null>(null);

  // Fetch available commands for this context
  const commandsQuery = useQuery({
    queryKey: ['available-commands', project, xsiType],
    enabled: !!client && isOpen,
    queryFn: async () => {
      const available = await client?.getAvailableCommands(xsiType, project) || [];

      // Get full command details for enabled wrappers
      const allCommands = await client?.getCommands() || [];

      return available.filter(summary => summary.enabled !== false).map(summary => {
        const wrapperId = summary['wrapper-id'] ?? summary.wrapperId;

        // Find the full command and wrapper details
        for (const cmd of allCommands) {
          const wrappers = cmd.xnat ?? cmd['xnat-command-wrappers'] ?? cmd.xnatCommandWrappers ?? [];
          const wrapper = wrappers.find((w: XnatCommandWrapper) => w.id === wrapperId);
          if (wrapper) {
            return { command: cmd, wrapper, summary };
          }
        }
        return null;
      }).filter(Boolean);
    },
  });

  const commands = commandsQuery.data ?? [];

  const handleLaunchClick = (command: XnatCommand, wrapper: XnatCommandWrapper) => {
    setSelectedWrapper({ command, wrapper });
  };

  const handleClose = () => {
    setSelectedWrapper(null);
  };

  const handleSuccess = () => {
    setSelectedWrapper(null);
    setIsOpen(false);
  };

  if (!client) return null;

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Rocket className="h-4 w-4" />
          Run Processing
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="text-sm font-semibold text-gray-900">Available Commands</div>
                  {label && (
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  )}
                </div>

                {commandsQuery.isLoading ? (
                  <div className="px-4 py-8 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : commandsQuery.isError ? (
                  <div className="px-4 py-3 text-sm text-red-600">
                    Failed to load commands
                  </div>
                ) : commands.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No commands available for this context
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {commands.map((item: any) => {
                      if (!item) return null;
                      const { command, wrapper } = item;

                      return (
                        <button
                          key={wrapper.id}
                          type="button"
                          onClick={() => handleLaunchClick(command, wrapper)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {command.name}
                              </div>
                              <div className="text-xs text-gray-600 truncate">
                                {wrapper.name}
                              </div>
                              {wrapper.description && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {wrapper.description}
                                </div>
                              )}
                            </div>
                            <Play className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Launch Modal */}
      {selectedWrapper && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleClose}
            />

            <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedWrapper.command.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {selectedWrapper.wrapper.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="px-6 py-4">
                {/* Command Details */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  {selectedWrapper.wrapper.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedWrapper.wrapper.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Image:</span>{' '}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                        {selectedWrapper.command.image}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Version:</span>{' '}
                      {selectedWrapper.command.version}
                    </div>
                    {label && (
                      <div>
                        <span className="font-medium">Target:</span> {label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Launch Form */}
                <LaunchForm
                  wrapperId={selectedWrapper.wrapper.id}
                  project={project}
                  rootElement={rootElement}
                  initialParams={contextParams}
                  onSuccess={handleSuccess}
                  onCancel={handleClose}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProcessingMenu;
