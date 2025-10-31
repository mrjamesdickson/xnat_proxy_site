import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { useDownload, type DownloadProgress } from '../contexts/DownloadContext';
import {
  Download,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

const resolveSubjectMetadata = (
  experiment: any,
  subjectLabelMap: Map<string, string>
) => {
  if (!experiment) {
    return { subjectId: undefined, subjectLabel: undefined };
  }

  const subjectId =
    experiment.subject_ID ||
    experiment.subject_id ||
    experiment.subjectId ||
    experiment.subject ||
    (typeof experiment.URI === 'string'
      ? experiment.URI.split('/subjects/')[1]?.split('/')[0]
      : undefined);

  const subjectLabelFromExperiment =
    experiment.subject_label ||
    experiment.subjectLabel ||
    experiment.SUBJECT_LABEL;

  const subjectLabel =
    subjectLabelFromExperiment ||
    (subjectId ? subjectLabelMap.get(subjectId) : undefined);

  return {
    subjectId: subjectId ?? undefined,
    subjectLabel: subjectLabel ?? undefined,
  };
}; 

export function ProjectDownload() {
  const { project } = useParams<{ project: string }>();
  const { client } = useXnat();
  const { startDownloads, isDownloading, updateProgress } = useDownload();

  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  // Fetch project details
  const { data: projectData } = useQuery({
    queryKey: ['project', project],
    queryFn: () => client?.getProject(project!),
    enabled: !!client && !!project,
  });

  // Fetch experiments (sessions) for the project
  const { data: experiments, isLoading: isLoadingExperiments } = useQuery({
    queryKey: ['experiments', project],
    queryFn: () => client?.getExperiments(project!),
    enabled: !!client && !!project,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', project],
    queryFn: () => client?.getSubjects(project!),
    enabled: !!client && !!project,
  });

  const subjectLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    if (subjects) {
      subjects.forEach((subject: any) => {
        const subjectId = subject.id || subject.ID;
        const label = subject.label || subject.LABEL;
        if (subjectId && label) {
          map.set(subjectId, label);
        }
        if (label) {
          map.set(label, label);
        }
      });
    }
    return map;
  }, [subjects]);


  const handleToggleSession = (sessionId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleToggleAllSessions = () => {
    if (selectedSessions.size === experiments?.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(
        experiments?.map((exp: any) => exp.ID || exp.id).filter(Boolean) || []
      ));
    }
  };

  const handleSubmit = async () => {
    if (selectedSessions.size === 0) {
      alert('Please select at least one session to download.');
      return;
    }

    // Initialize progress tracking
    const progressItems: DownloadProgress[] = Array.from(selectedSessions).map(expId => {
      const experiment = experiments?.find(
        (exp) => (exp.ID || exp.id) === expId
      );
      const { subjectId, subjectLabel } = resolveSubjectMetadata(experiment, subjectLabelMap);
      return {
        experimentId: expId,
        experimentLabel: experiment?.label || expId,
        subjectId,
        subjectLabel,
        status: 'pending' as const,
      };
    });

    const baseURL = client?.getHttpClient().defaults.baseURL || '';

    // Start downloads using the global context
    await startDownloads(progressItems, async (item, index) => {
      if (!project) {
        throw new Error('Project ID is missing from the route.');
      }

      const experimentLabel = item.experimentLabel || item.experimentId;
      let subjectLabel = item.subjectLabel;
      let subjectId = item.subjectId;

      if ((!subjectLabel || subjectLabel === 'UNKNOWN_SUBJECT') && experiments) {
        const experiment = experiments.find(
          (exp: any) => exp.id === item.experimentId || exp.ID === item.experimentId
        );
        if (experiment) {
          const resolved = resolveSubjectMetadata(experiment, subjectLabelMap);
          subjectId = subjectId || resolved.subjectId;
          subjectLabel = subjectLabel || resolved.subjectLabel;
        }
      }

      if ((!subjectLabel || subjectLabel === 'UNKNOWN_SUBJECT') && subjectId && client) {
        try {
          const subjectDetails = await client.getSubject(project, subjectId);
          subjectLabel = subjectDetails.label || subjectDetails.id || subjectLabel;
        } catch (lookupError) {
          console.warn(`Unable to resolve subject label for ${subjectId}`, lookupError);
        }
      }

      subjectLabel = subjectLabel || subjectId || experimentLabel;

      if (!subjectLabel) {
        throw new Error(`Unable to determine subject label for experiment ${item.experimentId}.`);
      }

      const downloadUrl = `${baseURL}/data/archive/projects/${encodeURIComponent(project)}/subjects/${encodeURIComponent(subjectLabel)}/experiments/${encodeURIComponent(experimentLabel)}/scans/ALL/files?format=zip`;
      console.log(`Downloading experiment ${item.experimentId} scans from:`, downloadUrl);

      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.experimentLabel}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Update status to success
      updateProgress(index, { status: 'success', sizeBytes: blob.size });
    });
  };

  if (!project) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg text-gray-900">Project not specified</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/projects/${project}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Download: {projectData?.name || project}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Select sessions and configure download options for imaging data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Select Sessions */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Sessions to Download</h3>

          <div className="mb-4">
            <div
              onClick={handleToggleAllSessions}
              className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              {selectedSessions.size === experiments?.length && experiments?.length > 0 ? (
                <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Square className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            {isLoadingExperiments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !experiments || experiments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">No sessions found</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {experiments.map((exp: any) => {
                  const sessionId = exp.ID || exp.id;
                  if (!sessionId) {
                    return null;
                  }

                  const sessionLabel = exp.label || sessionId;
                  const isSelected = selectedSessions.has(sessionId);

                  return (
                    <div
                      key={sessionId}
                      onClick={() => handleToggleSession(sessionId)}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/40' : ''}`}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{sessionLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Download */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Download Sessions</h3>

          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Each selected session will be downloaded as a separate ZIP file containing all imaging data and metadata.
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isDownloading || selectedSessions.size === 0}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md font-semibold text-white transition-colors ${
              isDownloading || selectedSessions.size === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Selected Sessions
              </>
            )}
          </button>

          {selectedSessions.size > 0 && (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-3">
              {selectedSessions.size} session{selectedSessions.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
