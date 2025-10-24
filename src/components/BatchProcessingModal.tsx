import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatCommand, XnatCommandWrapper, XnatLaunchUiInput } from '../services/xnat-api';
import clsx from 'clsx';

interface BatchProcessingModalProps {
  selectedExperiments: Set<string>;
  selectedExperimentData: any[]; // Full experiment objects with URI
  projectId: string;
  preselectedCommand?: any;
  preselectedWrapper?: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BatchProcessingModal({
  selectedExperiments,
  selectedExperimentData,
  projectId,
  preselectedCommand,
  preselectedWrapper,
  onClose,
  onSuccess,
}: BatchProcessingModalProps) {
  const { client } = useXnat();
  const [selectedCommand] = useState<XnatCommand | null>(preselectedCommand || null);
  const [selectedWrapper] = useState<XnatCommandWrapper | null>(preselectedWrapper || null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(null);


  // Fetch bulk launch UI for selected wrapper
  const launchUiQuery = useQuery({
    queryKey: ['batch-launch-ui', selectedWrapper?.id, projectId],
    enabled: !!client && !!selectedWrapper && selectedExperimentData.length > 0,
    queryFn: async () => {
      if (!selectedWrapper || !client) return null;

      // Get first experiment to use as sample
      const firstExperiment = selectedExperimentData.find(exp => {
        const expId = exp.id || exp.ID || exp.label;
        return selectedExperiments.has(expId);
      });

      if (!firstExperiment) return null;

      // Build archive URI for the sample experiment
      const experimentId = firstExperiment.id || firstExperiment.ID;
      const sampleTarget = `/archive/experiments/${experimentId}`;

      // Call bulk launch endpoint with sample target
      const url = `/xapi/projects/${projectId}/wrappers/${selectedWrapper.id}/bulklaunch`;
      const params = new URLSearchParams({
        format: 'json',
        sampleTarget,
        rootElement: 'session'
      });

      const response = await client.getHttpClient().get(`${url}?${params.toString()}`);
      return response.data;
    },
  });

  const launchUi = launchUiQuery.data;

  // Add debug logging
  useEffect(() => {
    if (launchUi) {
      console.log('📦 Bulk Launch UI data:', launchUi);
      console.log('📦 Input config:', launchUi['input-config'] || launchUi.inputs);
      console.log('📦 Input values:', launchUi['input-values']);
    }
  }, [launchUi]);

  // Merge input-config with input-values
  const inputs = useMemo(() => {
    const inputConfig = launchUi?.['input-config'] ?? launchUi?.inputs ?? [];
    const inputValues = launchUi?.['input-values'] ?? [];

    const valuesMap = new Map();
    inputValues.forEach((inputValue: any) => {
      if (inputValue.values && inputValue.values.length > 0) {
        valuesMap.set(inputValue.name, inputValue.values);
      }
    });

    const merged = inputConfig.map((input: XnatLaunchUiInput) => ({
      ...input,
      values: valuesMap.get(input.name) || input.values || []
    }));

    console.log('📦 Merged inputs:', merged);
    return merged;
  }, [launchUi]);

  // Set default form values when launch UI loads
  useEffect(() => {
    if (launchUi) {
      const defaults: Record<string, string> = {};

      const inputValues = launchUi['input-values'] ?? [];
      inputValues.forEach((inputValue: any) => {
        // Skip session input - we build it separately from selected experiments
        if (inputValue.name === 'session') return;

        if (inputValue.values && inputValue.values.length > 0) {
          const firstValue = inputValue.values[0].value;
          if (firstValue !== undefined && firstValue !== null) {
            defaults[inputValue.name] = String(firstValue);
          }
        }
      });

      const inputConfig = launchUi['input-config'] ?? launchUi.inputs ?? [];
      inputConfig.forEach((input: XnatLaunchUiInput) => {
        // Skip session input - we build it separately from selected experiments
        if (input.name === 'session') return;

        const defaultValue = input['default-value'] ?? input.defaultValue;
        if (defaultValue !== undefined && defaultValue !== null && !(input.name in defaults)) {
          defaults[input.name] = String(defaultValue);
        }
      });

      console.log('📝 Batch form defaults set:', defaults);
      setFormValues(defaults);
    }
  }, [launchUi]);


  const handleLaunch = async () => {
    if (!client || !selectedCommand || !selectedWrapper) return;

    setIsLaunching(true);
    setLaunchResult(null);

    try {
      const wrapperId = selectedWrapper.id || 0;

      // Extract experiment URIs from the full experiment data
      const experimentUris = selectedExperimentData
        .filter(exp => {
          const expId = exp.id || exp.ID || exp.label;
          return selectedExperiments.has(expId);
        })
        .map(exp => {
          // Build archive URI using experiment ID (not label)
          const experimentId = exp.id || exp.ID;
          return `/archive/experiments/${experimentId}`;
        })
        .filter(Boolean);

      console.log('🚀 Batch launching:', { experimentUris, formValues });

      // Build the session JSON string
      const sessionJson = JSON.stringify(experimentUris);
      console.log('📤 Session JSON string:', sessionJson);
      console.log('📤 Session JSON string type:', typeof sessionJson);
      console.log('📤 Session JSON string length:', sessionJson.length);

      // Build POST body - session should be a JSON-stringified array as a string value
      // The whole payload is then sent as JSON, so session becomes a quoted JSON string
      const payload = {
        session: sessionJson,
        ...Object.fromEntries(
          Object.entries(formValues).map(([k, v]) => [k, String(v)])
        )
      };

      console.log('📤 Full payload object:', payload);
      console.log('📤 Full payload as JSON:', JSON.stringify(payload, null, 2));

      const url = `/xapi/projects/${projectId}/wrappers/${wrapperId}/root/session/bulklaunch`;
      console.log('📤 URL:', url);

      await client.getHttpClient().post(url, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      setLaunchResult({
        success: true,
        message: `Successfully launched ${selectedCommand.name} on ${experimentUris.length} experiment${experimentUris.length !== 1 ? 's' : ''}`,
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

  // If command/wrapper are preselected, show only config dialog
  if (preselectedCommand && preselectedWrapper) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
            onClick={onClose}
          ></div>

          {/* Dialog panel */}
          <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCommand?.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedExperiments.size} item{selectedExperiments.size !== 1 ? 's' : ''} selected to run in bulk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Experiment List */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session
                </label>
                <textarea
                  readOnly
                  value={selectedExperimentData
                    .filter(exp => {
                      const expId = exp.id || exp.ID || exp.label;
                      return selectedExperiments.has(expId);
                    })
                    .map(exp => exp.label || exp.ID || exp.id)
                    .join('\n')}
                  className="block w-full h-32 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 sm:text-sm sm:leading-6 resize-none"
                />
              </div>

              {/* Derived/Informational Fields - Sample from first experiment */}
              {selectedExperimentData.length > 0 && (() => {
                const firstExperiment = selectedExperimentData.find(exp => {
                  const expId = exp.id || exp.ID || exp.label;
                  return selectedExperiments.has(expId);
                });

                if (!firstExperiment) return null;

                const sampleFields = [
                  {
                    label: 'Session-Id',
                    description: '[Derived from session > id]',
                    value: firstExperiment.id || firstExperiment.ID,
                    sample: `Value for first session as a sample: "${firstExperiment.id || firstExperiment.ID}"`
                  },
                  {
                    label: 'Session-Label',
                    description: '[Derived from session > label]',
                    value: firstExperiment.label,
                    sample: `Value for first session as a sample: "${firstExperiment.label}"`
                  },
                  {
                    label: 'Subject-Label',
                    description: '[Derived from session > Subject > label]',
                    value: firstExperiment.subject_label || firstExperiment['subject_label'] || firstExperiment.label,
                    sample: `Value for first session as a sample: "${firstExperiment.subject_label || firstExperiment['subject_label'] || firstExperiment.label}"`
                  },
                  {
                    label: 'Project-Id',
                    description: '[Derived from session > Project > id]',
                    value: firstExperiment.project || projectId,
                    sample: `Value for first session as a sample: "${firstExperiment.project || projectId}"`
                  },
                  {
                    label: 'Session-Dir',
                    description: '[Derived from session > directory]',
                    value: (() => {
                      const project = firstExperiment.project || projectId;
                      const sessionLabel = firstExperiment.label;
                      return `/data/xnat/archive/${project}/arc001/${sessionLabel}/`;
                    })(),
                    sample: (() => {
                      const project = firstExperiment.project || projectId;
                      const sessionLabel = firstExperiment.label;
                      return `Value for first session as a sample: "/data/xnat/archive/${project}/arc001/${sessionLabel}/"`;
                    })()
                  }
                ];

                return (
                  <div className="mb-4 space-y-3">
                    {sampleFields.map(field => (
                      <div key={field.label}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <p className="text-xs text-gray-500 mb-1">{field.description}</p>
                        <p className="text-xs text-gray-500 mb-1">{field.sample}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Loading */}
              {launchUiQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading configuration...</span>
                </div>
              )}

              {/* Derived Fields (non-user-settable) */}
              {inputs && inputs.filter((i: any) => !(i['user-settable'] ?? i.userSettable ?? true)).length > 0 && (
                <div className="mb-4 space-y-3">
                  {inputs
                    .filter((i: any) => !(i['user-settable'] ?? i.userSettable ?? true))
                    .map((input: XnatLaunchUiInput) => {
                      const inputLabel = input.label || input.name;
                      const inputDescription = input.description;
                      const derivedValue = formValues[input.name] || '';

                      return (
                        <div key={input.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {inputLabel}
                          </label>
                          {inputDescription && (
                            <p className="text-xs text-gray-500 mb-1">{inputDescription}</p>
                          )}
                          <input
                            type="text"
                            readOnly
                            value={derivedValue}
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 sm:text-sm sm:leading-6"
                          />
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Form Inputs (user-settable) */}
              {inputs && inputs.filter((i: any) => {
                const isUserSettable = i['user-settable'] ?? i.userSettable ?? true;
                const isSessionInput = i.name === 'session';
                return isUserSettable && !isSessionInput;
              }).length > 0 && (
                <div className="mb-4">
                  <div className="space-y-4">
                    {inputs
                      .filter((i: any) => {
                        const isUserSettable = i['user-settable'] ?? i.userSettable ?? true;
                        const isSessionInput = i.name === 'session';
                        return isUserSettable && !isSessionInput;
                      })
                      .map((input: XnatLaunchUiInput) => {
                        const inputLabel = input.label || input.name;
                        const inputDescription = input.description;
                        const inputType = input.type || 'string';
                        const isRequired = input.required ?? false;
                        const values = input.values || [];

                        return (
                          <div key={input.name}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {inputLabel}
                              {isRequired && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {inputDescription && (
                              <p className="text-xs text-gray-500 mb-2">{inputDescription}</p>
                            )}

                          {values.length > 0 ? (
                            <select
                              value={formValues[input.name] || ''}
                              onChange={(e) =>
                                setFormValues((prev) => ({ ...prev, [input.name]: e.target.value }))
                              }
                              required={isRequired}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            >
                              {!isRequired && <option value="">-- Select --</option>}
                              {values.map((v) => {
                                const optionValue = String(v.value ?? v);
                                const optionLabel = v.label || optionValue;
                                return (
                                  <option key={optionValue} value={optionValue}>
                                    {optionLabel}
                                  </option>
                                );
                              })}
                            </select>
                          ) : inputType === 'boolean' ? (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formValues[input.name] === 'true'}
                                onChange={(e) =>
                                  setFormValues((prev) => ({
                                    ...prev,
                                    [input.name]: e.target.checked ? 'true' : 'false',
                                  }))
                                }
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                              />
                            </div>
                          ) : inputType === 'number' ? (
                            <input
                              type="number"
                              value={formValues[input.name] || ''}
                              onChange={(e) =>
                                setFormValues((prev) => ({ ...prev, [input.name]: e.target.value }))
                              }
                              required={isRequired}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            />
                          ) : (
                            <input
                              type="text"
                              value={formValues[input.name] || ''}
                              onChange={(e) =>
                                setFormValues((prev) => ({ ...prev, [input.name]: e.target.value }))
                              }
                              required={isRequired}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            />
                          )}
                        </div>
                      );
                    })}
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
            <div className="bg-gray-50 px-4 py-3 flex flex-row-reverse gap-2">
              <button
                type="button"
                onClick={handleLaunch}
                disabled={isLaunching}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm',
                  isLaunching
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
                  'Launch'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLaunching}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no command/wrapper preselected, show error
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:align-middle p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h3 className="text-lg font-semibold">Error</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            No container command was selected. Please select a container from the dropdown to continue.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
