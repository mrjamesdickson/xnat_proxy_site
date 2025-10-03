import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import {
  ArrowLeft,
  Calendar,
  User,
  Folder,
  Activity,
  Camera,
  FileImage,
  Settings,
  Eye,
  Monitor
} from 'lucide-react';
import { ScanSnapshot } from './ScanSnapshot';

export function ExperimentDetail() {
  const { project, subject, experiment } = useParams<{
    project: string;
    subject: string;
    experiment: string;
  }>();
  
  const { client } = useXnat();

  // Get the XNAT base URL for the viewer link
  const xnatConfig = client?.getConfig();
  const baseURL = xnatConfig?.baseURL || '';
  
  // Construct the OHIF viewer URL using actual XNAT IDs
  const getViewerUrl = () => {
    // Use the actual IDs from the fetched data
    const subjectId = subjectData?.id || subject;
    const experimentId = experimentData?.id || experiment;
    const experimentLabel = experimentData?.label || experiment;
    
    return `${baseURL}/VIEWER/?subjectId=${subjectId}&projectId=${project}&experimentId=${experimentId}&experimentLabel=${experimentLabel}`;
  };

  const { data: experimentData, isLoading, error } = useQuery({
    queryKey: ['experiment', project, subject, experiment],
    queryFn: async () => {
      const result = await client?.getExperiment(project!, subject!, experiment!);
      console.log('📊 Experiment data fetched:', result);
      return result || null;
    },
    enabled: !!client && !!project && !!subject && !!experiment,
  });

  const { data: subjectData } = useQuery({
    queryKey: ['subject', project, subject],
    queryFn: () => client?.getSubject(project!, subject!) || null,
    enabled: !!client && !!project && !!subject,
  });

  const { data: scans } = useQuery({
    queryKey: ['scans', project, subject, experiment],
    queryFn: () => client?.getScans(project!, subject!, experiment!) || [],
    enabled: !!client && !!project && !!subject && !!experiment,
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            Failed to load experiment details. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading experiment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link to="/projects" className="hover:text-gray-700">Projects</Link>
        <span>/</span>
        <Link to="/experiments" className="hover:text-gray-700">Experiments</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{project}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{subject}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{experiment}</span>
      </nav>

      {/* Back Button */}
      <div>
        <Link
          to="/experiments"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Experiments
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900">
              {experimentData?.label || experiment}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Experiment ID: {experiment}
            </p>
          </div>
          
          {experimentData?.modality && (
            <div className="flex items-center">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800">
                <Camera className="h-4 w-4 mr-1" />
                {experimentData.modality.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Experiment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center">
                <Folder className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Project</div>
                  <div className="text-sm text-gray-500">{project}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Subject</div>
                  <div className="text-sm text-gray-500">{subject}</div>
                </div>
              </div>
              
              {experimentData?.date && (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Date</div>
                    <div className="text-sm text-gray-500">
                      {new Date(experimentData.date).toLocaleDateString()}
                      {experimentData.time && ` • ${experimentData.time}`}
                    </div>
                  </div>
                </div>
              )}
              
              {experimentData?.scanner && (
                <div className="flex items-center">
                  <Settings className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Scanner</div>
                    <div className="text-sm text-gray-500">{experimentData.scanner}</div>
                  </div>
                </div>
              )}
            </div>
            
            {experimentData?.note && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">Notes</div>
                <div className="text-sm text-gray-600">{experimentData.note}</div>
              </div>
            )}
          </div>

          {/* Scans */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold leading-6 text-gray-900">
                Scans ({scans?.length || 0})
              </h2>
              <Link
                to={`/experiments/${project}/${subject}/${experiment}/scans`}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <Eye className="h-4 w-4 mr-1" />
                View All Scans
              </Link>
            </div>
            
            {scans && scans.length > 0 ? (
              <div className="space-y-3">
                {scans.slice(0, 5).map((scan: any) => {
                  // Use experiment ID (not label) for snapshot URL
                  const experimentId = experimentData?.id || experiment;
                  const snapshotUrl =
                    client && project && subject && experimentId
                      ? client.getScanThumbnailUrl(project, subject, experimentId, scan.id)
                      : null;

                  return (
                    <div key={scan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center min-w-0">
                        <ScanSnapshot
                          snapshotUrl={snapshotUrl}
                          alt={`Snapshot of ${scan.series_description || `Scan ${scan.id}`}`}
                          containerClassName="h-16 w-24 mr-3 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {scan.series_description || `Scan ${scan.id}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {scan.type} • {scan.quality || 'Unknown quality'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        <div>{scan.frames ? `${scan.frames} frames` : ''}</div>
                        <div className="text-[10px] text-gray-400">{scan.id}</div>
                      </div>
                    </div>
                  );
                })}
                
                {scans.length > 5 && (
                  <div className="text-center pt-2">
                    <Link
                      to={`/experiments/${project}/${subject}/${experiment}/scans`}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      View {scans.length - 5} more scans...
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <FileImage className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <div className="text-sm">No scans found</div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Validation */}
          {experimentData?.validation && (
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
              <div className="space-y-3">
                <div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    experimentData.validation.status === 'valid' 
                      ? 'bg-green-100 text-green-800'
                      : experimentData.validation.status === 'questionable'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <Activity className="h-3 w-3 mr-1" />
                    {experimentData.validation.status}
                  </span>
                </div>
                {experimentData.validation.notes && (
                  <div className="text-xs text-gray-600">
                    {experimentData.validation.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Technical Details</h3>
            <div className="space-y-3 text-sm">
              {experimentData?.xsiType && (
                <div>
                  <div className="text-gray-500">Type</div>
                  <div className="text-gray-900">{experimentData.xsiType.replace('xnat:', '')}</div>
                </div>
              )}
              
              {experimentData?.operator && (
                <div>
                  <div className="text-gray-500">Operator</div>
                  <div className="text-gray-900">{experimentData.operator}</div>
                </div>
              )}
              
              {experimentData?.session_type && (
                <div>
                  <div className="text-gray-500">Session Type</div>
                  <div className="text-gray-900">{experimentData.session_type}</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => window.open(getViewerUrl(), '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')}
                className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <Monitor className="h-4 w-4 mr-2" />
                OHIF Viewer (New Window)
              </button>
              
              <button
                onClick={() => window.open(getViewerUrl(), 'ohif-viewer-tab')}
                className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Monitor className="h-4 w-4 mr-2" />
                OHIF Viewer (New Tab)
              </button>
              
              <Link
                to={`/experiments/${project}/${subject}/${experiment}/scans`}
                className="block w-full text-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                View Scans
              </Link>
              
              <Link
                to={`/upload?project=${project}&subject=${subject}&experiment=${experiment}`}
                className="block w-full text-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Upload Files
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}