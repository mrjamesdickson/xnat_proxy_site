import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  Upload as UploadIcon,
  File as FileIcon,
  X,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type {
  XnatExperiment,
  XnatProject,
  XnatResource,
  XnatSubject,
} from '../services/xnat-api';

interface UploadResult {
  success: boolean;
  filename: string;
  error?: string;
}

interface UploadMutationOutput {
  results: UploadResult[];
  createdSubject: boolean;
  createdExperiment: boolean;
  usedNewSubject: boolean;
  usedNewExperiment: boolean;
  subjectId: string;
  experimentId: string;
  resourceId: string;
}

const valueFromKeys = (
  input: unknown,
  keys: string[],
): string | undefined => {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const object = input as Record<string, unknown>;
  for (const key of keys) {
    const value = object[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

const isConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const axiosError = error as AxiosError;
  return axiosError?.response?.status === 409;
};

const toError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallbackMessage);
};

const getProjectId = (project: Partial<XnatProject> | null | undefined): string =>
  valueFromKeys(project, ['id', 'ID', 'name', 'Name']) ?? '';

const getSubjectId = (subject: Partial<XnatSubject> | null | undefined): string =>
  valueFromKeys(subject, [
    'id',
    'ID',
    'subject_id',
    'subject_ID',
    'label',
  ]) ?? '';

const getExperimentId = (
  experiment: Partial<XnatExperiment> | null | undefined,
): string =>
  valueFromKeys(experiment, [
    'id',
    'ID',
    'label',
    'session_ID',
    'session_id',
  ]) ?? '';

const getResourceId = (resource: Partial<XnatResource> | null | undefined): string =>
  valueFromKeys(resource, ['label', 'ID', 'id', 'name']) ?? '';

export function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { client } = useXnat();

  const [selectedProject, setSelectedProject] = useState(
    searchParams.get('project') || ''
  );
  const [selectedSubject, setSelectedSubject] = useState(
    searchParams.get('subject') || ''
  );
  const [selectedExperiment, setSelectedExperiment] = useState(
    searchParams.get('experiment') || ''
  );
  const [resourceId, setResourceId] = useState(
    searchParams.get('resource') || 'DICOM'
  );
  const [newSubjectLabel, setNewSubjectLabel] = useState('');
  const [newExperimentLabel, setNewExperimentLabel] = useState('');

  const trimmedNewSubject = newSubjectLabel.trim();
  const trimmedNewExperiment = newExperimentLabel.trim();
  const usingNewSubject = trimmedNewSubject.length > 0;
  const usingNewExperiment = trimmedNewExperiment.length > 0;
  const effectiveSubjectId = usingNewSubject ? trimmedNewSubject : selectedSubject;
  const effectiveExperimentId = usingNewExperiment
    ? trimmedNewExperiment
    : selectedExperiment;

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => client?.getProjects() || [],
    enabled: !!client,
  });

  const {
    data: subjects,
    isLoading: subjectsLoading,
    error: subjectsError,
  } = useQuery({
    queryKey: ['subjects', selectedProject],
    queryFn: () => client?.getSubjects(selectedProject) || [],
    enabled: !!client && Boolean(selectedProject),
  });

  const {
    data: experiments,
    isLoading: experimentsLoading,
    error: experimentsError,
  } = useQuery({
    queryKey: ['experiments', selectedProject, selectedSubject],
    queryFn: () => client?.getExperiments(selectedProject, selectedSubject) || [],
    enabled:
      !!client && Boolean(selectedProject) && Boolean(selectedSubject) && !usingNewSubject,
  });

  const {
    data: resources,
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useQuery({
    queryKey: [
      'resources',
      selectedProject,
      selectedSubject,
      selectedExperiment,
    ],
    queryFn: () =>
      client?.getResources(
        selectedProject,
        selectedSubject,
        selectedExperiment
      ) || [],
    enabled:
      !!client &&
      Boolean(selectedProject) &&
      Boolean(selectedSubject) &&
      Boolean(selectedExperiment) &&
      !usingNewSubject &&
      !usingNewExperiment,
  });

  const resourceOptions = useMemo(
    () => resources?.map((resource) => getResourceId(resource)).filter(Boolean) || [],
    [resources]
  );

  useEffect(() => {
    if (!selectedProject && projects?.length) {
      setSelectedProject(getProjectId(projects[0]));
    }
  }, [projects, selectedProject]);

  useEffect(() => {
    if (usingNewSubject) {
      return;
    }

    if (selectedProject && subjects?.length) {
      const hasSubject = subjects.some(
        (subject) => getSubjectId(subject) === selectedSubject
      );
      if (!hasSubject) {
        setSelectedSubject(getSubjectId(subjects[0]));
      }
    } else if (!subjectsLoading && selectedSubject) {
      setSelectedSubject('');
    }
  }, [selectedProject, subjects, subjectsLoading, selectedSubject, usingNewSubject]);

  useEffect(() => {
    if (usingNewExperiment) {
      return;
    }

    if (selectedSubject && experiments?.length) {
      const hasExperiment = experiments.some(
        (experiment) =>
          getExperimentId(experiment) === selectedExperiment
      );
      if (!hasExperiment) {
        setSelectedExperiment(getExperimentId(experiments[0]));
      }
    } else if (!experimentsLoading && selectedExperiment) {
      setSelectedExperiment('');
    }
  }, [selectedSubject, experiments, experimentsLoading, selectedExperiment, usingNewExperiment]);

  useEffect(() => {
    if (!resourceId && resourceOptions.length > 0) {
      setResourceId(resourceOptions[0]);
    }
  }, [resourceId, resourceOptions]);

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(event.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMutation = useMutation<UploadMutationOutput, Error, File[]>({
    mutationFn: async (selectedFiles) => {
      if (!client) {
        throw new Error('XNAT client is not available. Please sign in again.');
      }

      const projectId = selectedProject.trim();
      if (!projectId) {
        throw new Error('Select a project before uploading.');
      }

      const subjectId = effectiveSubjectId.trim();
      if (!subjectId) {
        throw new Error('Select an existing subject or enter a new subject label.');
      }

      const experimentId = effectiveExperimentId.trim();
      if (!experimentId) {
        throw new Error('Select an existing session or enter a new session label.');
      }

      const finalResourceId = resourceId.trim();
      if (!finalResourceId) {
        throw new Error('Enter a resource label to store uploaded files.');
      }

      let createdSubject = false;
      if (usingNewSubject) {
        try {
          await client.createSubject(projectId, {
            label: subjectId,
            id: subjectId,
          });
          createdSubject = true;
        } catch (error) {
          if (!isConflictError(error)) {
            throw toError(error, 'Failed to create subject');
          }
        }
      }

      let createdExperiment = false;
      try {
        await client.createExperiment(projectId, subjectId, {
          label: experimentId,
          xsiType: 'xnat:mrSessionData',
        });
        createdExperiment = true;
      } catch (error) {
        if (!isConflictError(error)) {
          throw toError(error, 'Failed to create experiment');
        }
      }

      try {
        await client.createResource(projectId, subjectId, experimentId, {
          label: finalResourceId,
          format: 'DICOM',
          description: 'Uploaded via portal',
        });
      } catch (error) {
        if (!isConflictError(error)) {
          throw toError(error, 'Failed to prepare resource for upload');
        }
      }

      const results: UploadResult[] = [];

      for (const file of selectedFiles) {
        try {
          const isArchive =
            file.name.toLowerCase().endsWith('.zip') ||
            file.name.toLowerCase().endsWith('.tar') ||
            file.name.toLowerCase().endsWith('.tar.gz');

          if (isArchive) {
            results.push({
              success: false,
              filename: file.name,
              error:
                'Compressed uploads are not supported yet. Please extract and upload individual DICOM files.',
            });
            continue;
          }

          await client.uploadFile(
            projectId,
            subjectId,
            experimentId,
            finalResourceId,
            file
          );

          results.push({ success: true, filename: file.name });
        } catch (error) {
          const normalizedError = toError(error, 'Upload failed');
          console.error(`Failed to upload ${file.name}:`, normalizedError);
          results.push({
            success: false,
            filename: file.name,
            error: normalizedError.message,
          });
        }
      }

      return {
        results,
        createdSubject,
        createdExperiment,
        usedNewSubject: usingNewSubject,
        usedNewExperiment: usingNewExperiment,
        subjectId,
        experimentId,
        resourceId: finalResourceId,
      };
    },
    onMutate: () => {
      setFormError(null);
      setUploadResults([]);
    },
    onSuccess: (data) => {
      const {
        results,
        createdSubject,
        createdExperiment,
        usedNewSubject,
        usedNewExperiment,
        subjectId,
        experimentId,
        resourceId: finalResourceId,
      } = data;

      setUploadResults(results);

      if (resourceId !== finalResourceId) {
        setResourceId(finalResourceId);
      }

      const successfulUploads = results
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.success)
        .map(({ index }) => index);

      if (successfulUploads.length > 0) {
        setFiles((prev) => prev.filter((_, index) => !successfulUploads.includes(index)));
        queryClient.invalidateQueries({
          queryKey: ['files', selectedProject, subjectId, experimentId, finalResourceId],
        });
      }

      queryClient.invalidateQueries({ queryKey: ['resources'], exact: false });

      if (usedNewSubject || createdSubject) {
        setSelectedSubject(subjectId);
        setNewSubjectLabel('');
        queryClient.invalidateQueries({ queryKey: ['subjects'], exact: false });
      }

      if (usedNewExperiment || createdExperiment) {
        setSelectedExperiment(experimentId);
        setNewExperimentLabel('');
        queryClient.invalidateQueries({ queryKey: ['experiments'], exact: false });
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'There was a problem uploading your files. Please try again.';
      setFormError(message);
    },
  });

  const handleUpload = () => {
    if (files.length === 0) {
      setFormError('Add at least one file to upload.');
      return;
    }
    setFormError(null);
    uploadMutation.mutate(files);
  };

  if (!client) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-lg bg-yellow-50 p-6 text-sm text-yellow-800 max-w-md text-center">
          <p className="font-medium">You are not connected to an XNAT server.</p>
          <p className="mt-2">
            Sign in through the portal to configure upload destinations and retry.
          </p>
        </div>
      </div>
    );
  }

  const selectionError =
    projectsError ||
    subjectsError ||
    experimentsError ||
    resourcesError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Upload Data
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload DICOM images and supporting files directly into your XNAT project.
        </p>
      </div>

      {selectionError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load upload targets. Refresh the page or verify your XNAT connection.
        </div>
      )}

      {formError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project</label>
            <select
              className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              value={selectedProject}
              onChange={(event) => {
                setSelectedProject(event.target.value);
                setSelectedSubject('');
                setSelectedExperiment('');
                setNewSubjectLabel('');
                setNewExperimentLabel('');
              }}
              disabled={projectsLoading}
            >
              <option value="" disabled>
                {projectsLoading ? 'Loading projects...' : 'Select a project'}
              </option>
              {projects?.map((project) => {
                const id = getProjectId(project);
                return (
                  <option key={id} value={id}>
                    {project?.name || id}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <select
              className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              value={selectedSubject}
              onChange={(event) => {
                setSelectedSubject(event.target.value);
                setSelectedExperiment('');
                setNewSubjectLabel('');
                setNewExperimentLabel('');
              }}
              disabled={!selectedProject || subjectsLoading}
            >
              <option value="" disabled>
                {!selectedProject
                  ? 'Select a project first'
                  : subjectsLoading
                  ? 'Loading subjects...'
                  : 'Select a subject'}
              </option>
              {subjects?.map((subject) => {
                const id = getSubjectId(subject);
                return (
                  <option key={id} value={id}>
                    {subject?.label || id}
                  </option>
                );
              })}
            </select>
            <input
              type="text"
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              placeholder="Or enter a new subject label"
              value={newSubjectLabel}
              onChange={(event) => {
                const value = event.target.value;
                setNewSubjectLabel(value);
                if (value.trim().length > 0) {
                  setSelectedSubject('');
                  setSelectedExperiment('');
                }
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              XNAT will create the subject if it does not already exist in this project.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Experiment / Session</label>
            <select
              className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              value={selectedExperiment}
              onChange={(event) => {
                setSelectedExperiment(event.target.value);
                setNewExperimentLabel('');
              }}
              disabled={!selectedSubject || experimentsLoading}
            >
              <option value="" disabled>
                {!selectedSubject
                  ? 'Select a subject first'
                  : experimentsLoading
                  ? 'Loading experiments...'
                  : 'Select an experiment'}
              </option>
              {experiments?.map((experiment) => {
                const id = getExperimentId(experiment);
                return (
                  <option key={id} value={id}>
                    {experiment?.label || id}
                  </option>
                );
              })}
            </select>
            <input
              type="text"
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              placeholder="Or enter a new session label"
              value={newExperimentLabel}
              onChange={(event) => {
                const value = event.target.value;
                setNewExperimentLabel(value);
                if (value.trim().length > 0) {
                  setSelectedExperiment('');
                }
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              Provide the session label that XNAT should use when creating the experiment.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Resource (folder)
            </label>
            <div className="mt-1 flex gap-2">
              <select
                className="flex-1 rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                value={resourceOptions.includes(resourceId) ? resourceId : ''}
                onChange={(event) => setResourceId(event.target.value)}
                disabled={!selectedExperiment || resourcesLoading || resourceOptions.length === 0}
              >
                <option value="" disabled>
                  {!selectedExperiment
                    ? 'Select an experiment first'
                    : resourcesLoading
                    ? 'Loading resources...'
                    : resourceOptions.length === 0
                    ? 'No existing resources'
                    : 'Select resource'}
                </option>
                {resourceOptions.map((resource) => (
                  <option key={resource} value={resource}>
                    {resource}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="or enter new"
                value={resourceId}
                onChange={(event) => setResourceId(event.target.value)}
                className="w-36 rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900">
              Drop files here or click to browse
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              DICOM (`.dcm`, `.dicom`, `.nii`, `.nii.gz`). Archives are not yet supported.
            </p>
          </div>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".dcm,.dicom,.nii,.nii.gz"
          />
        </div>

        {files.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Selected Files ({files.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <FileIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-3 p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadResults.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Upload Results</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadResults.map((result, index) => (
                <div
                  key={`${result.filename}-${index}`}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <span className="text-sm font-medium truncate max-w-xs">
                      {result.filename}
                    </span>
                  </div>
                  {!result.success && result.error && (
                    <span className="ml-4 text-xs text-red-600 truncate">
                      {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending || files.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Files'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
