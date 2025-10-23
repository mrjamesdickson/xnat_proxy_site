import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Play,
  XCircle,
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import { useContainerJobs } from '../contexts/ContainerJobsContext';
import type { XnatLaunchUiInput, XnatLaunchReport } from '../services/xnat-api';

export interface LaunchFormProps {
  wrapperId: number;
  project?: string;
  rootElement: string;
  initialParams?: Record<string, string>;
  onSuccess?: (report: XnatLaunchReport) => void;
  onCancel?: () => void;
}

export function LaunchForm({
  wrapperId,
  project,
  rootElement,
  initialParams = {},
  onSuccess,
  onCancel,
}: LaunchFormProps) {
  const { client } = useXnat();
  const navigate = useNavigate();
  const { openWidget } = useContainerJobs();
  const [formValues, setFormValues] = useState<Record<string, string>>(initialParams);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const launchUiQuery = useQuery({
    queryKey: ['launch-ui', wrapperId, project, initialParams],
    enabled: !!client,
    queryFn: () => {
      // Pass archive paths directly - XNAT expects full paths for launch UI
      const launchParams: Record<string, string> = {};

      Object.entries(initialParams).forEach(([key, value]) => {
        // Skip xsiType - it's only for filtering commands, not for launch
        if (key === 'xsiType') {
          return;
        }

        launchParams[key] = value;
      });

      console.log('📋 Launch UI params:', { original: initialParams, processed: launchParams });

      return client?.getLaunchUi(wrapperId, launchParams, project) || null;
    },
  });

  const launchUi = launchUiQuery.data;

  // Merge input-config with input-values to get select options
  const inputs = useMemo(() => {
    const inputConfig = launchUi?.['input-config'] ?? launchUi?.inputs ?? [];
    const inputValues = launchUi?.['input-values'] ?? [];

    // Create a map of values by input name
    const valuesMap = new Map();
    inputValues.forEach((inputValue) => {
      if (inputValue.values && inputValue.values.length > 0) {
        valuesMap.set(inputValue.name, inputValue.values);
      }
    });

    // Merge values into input config
    const merged = inputConfig.map((input: XnatLaunchUiInput) => ({
      ...input,
      values: valuesMap.get(input.name) || input.values || []
    }));

    console.log('📋 Merged inputs with values:', merged.filter(i => i.values && i.values.length > 0));
    return merged;
  }, [launchUi]);

  // Clear any error state when component mounts or wrapper changes
  useEffect(() => {
    setSubmitResult(null);
  }, [wrapperId]);

  useEffect(() => {
    if (launchUi) {
      const defaults: Record<string, string> = {};

      // First, get values from input-values (these are resolved by XNAT)
      const inputValues = launchUi['input-values'] ?? [];
      inputValues.forEach((inputValue) => {
        if (inputValue.values && inputValue.values.length > 0) {
          const firstValue = inputValue.values[0].value;
          if (firstValue !== undefined && firstValue !== null) {
            defaults[inputValue.name] = String(firstValue);
          }
        }
      });

      // Then, apply defaults from input config
      const inputConfig = launchUi['input-config'] ?? launchUi.inputs ?? [];
      inputConfig.forEach((input: XnatLaunchUiInput) => {
        const defaultValue = input['default-value'] ?? input.defaultValue;
        if (defaultValue !== undefined && defaultValue !== null && !(input.name in defaults)) {
          defaults[input.name] = String(defaultValue);
        }
      });

      console.log('📝 Form defaults set:', defaults);
      setFormValues(defaults);
      // Clear any error state when form loads
      setSubmitResult(null);
    }
  }, [launchUi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    console.log('📝 Submitting launch form:', {
      wrapperId,
      rootElement,
      project,
      formValues
    });

    // Clear any previous results before starting
    setSubmitResult(null);
    setIsSubmitting(true);

    try {
      const report = await client.launchContainer(wrapperId, rootElement, formValues, project);

      console.log('📊 Launch report received:', report);

      // XNAT can return "success" (lowercase) or "Success" (capitalized)
      const isSuccess = report.status?.toLowerCase() === 'success';

      if (isSuccess) {
        const workflowId = report['workflow-id'] || report.workflowId;
        const message = `Container launched successfully!${workflowId ? ` Workflow ID: ${workflowId}` : ''}`;

        console.log('✅ Launch succeeded, setting success state');
        setIsSubmitting(false);
        setSubmitResult({ success: true, message });

        // Open the container jobs widget to show the new job
        openWidget();

        if (onSuccess) {
          onSuccess(report);
        } else {
          setTimeout(() => {
            navigate('/processing');
          }, 2000);
        }
      } else {
        console.log('❌ Launch failed with status:', report.status, 'message:', report.message);
        setIsSubmitting(false);
        setSubmitResult({
          success: false,
          message: report.message || 'Failed to launch container.',
        });
      }
    } catch (error) {
      console.log('❌ Exception during launch:', error);
      setIsSubmitting(false);
      setSubmitResult({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred while launching the container.',
      });
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    // Clear any previous error messages when user edits the form
    if (submitResult && !submitResult.success) {
      setSubmitResult(null);
    }
  };

  const requiredFields = useMemo(() => {
    return inputs
      .filter((input: XnatLaunchUiInput) => input.required)
      .map((input: XnatLaunchUiInput) => input.name);
  }, [inputs]);

  const isFormValid = useMemo(() => {
    return requiredFields.every((field) => {
      const value = formValues[field];
      return value !== undefined && value !== null && String(value).trim().length > 0;
    });
  }, [requiredFields, formValues]);

  if (!client) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-sm text-yellow-800 max-w-md">
        <p className="font-medium">You are not connected to an XNAT server.</p>
        <p className="mt-2">Sign in through the portal to launch containers.</p>
      </div>
    );
  }

  if (launchUiQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading launch form...</p>
        </div>
      </div>
    );
  }

  if (launchUiQuery.isError || !launchUi) {
    const errorMessage = launchUiQuery.error instanceof Error
      ? launchUiQuery.error.message
      : 'Please check your configuration and try again.';

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Unable to load launch form.</span>
        </div>
        <p className="mt-2">{errorMessage}</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium">Debug Info</summary>
          <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs">
            {JSON.stringify({
              wrapperId,
              project,
              rootElement,
              initialParams,
              error: errorMessage
            }, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitResult && !isSubmitting && (
        <div
          className={clsx(
            'rounded-lg border p-4',
            submitResult.success
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {submitResult.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{submitResult.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitResult(null)}
              className="text-current opacity-50 hover:opacity-100"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {inputs.map((input: XnatLaunchUiInput) => (
          <LaunchFormInput
            key={input.name}
            input={input}
            value={formValues[input.name] ?? ''}
            onChange={(value) => handleChange(input.name, value)}
          />
        ))}
      </div>

      {inputs.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
          <p>This command has no configurable parameters.</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={clsx(
            'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white',
            isFormValid && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Launch Container
            </>
          )}
        </button>
      </div>
    </form>
  );
}

interface LaunchFormInputProps {
  input: XnatLaunchUiInput;
  value: string;
  onChange: (value: string) => void;
}

function LaunchFormInput({ input, value, onChange }: LaunchFormInputProps) {
  const label = input.label || input.name;
  const description = input.description;
  const required = input.required ?? false;
  const isUserSettable = input['user-settable'] ?? input.userSettable ?? true;
  const values = input.values ?? [];
  const inputType = input.type?.toLowerCase() || 'string';

  if (!isUserSettable) {
    return null;
  }

  const renderInput = () => {
    if (values.length > 0) {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select {label.toLowerCase()}...</option>
          {values.map((option, index) => {
            const optionValue = option.value !== undefined ? String(option.value) : '';
            const optionLabel = option.label || optionValue;
            return (
              <option key={index} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
      );
    }

    if (inputType === 'boolean') {
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={value === 'true' || value === '1'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">{label}</span>
        </div>
      );
    }

    if (inputType === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={description ? `e.g., ${description}` : undefined}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  };

  if (inputType === 'boolean') {
    return <div className="space-y-1">{renderInput()}</div>;
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {renderInput()}
    </div>
  );
}

export default LaunchForm;
