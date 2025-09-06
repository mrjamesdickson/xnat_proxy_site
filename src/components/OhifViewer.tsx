import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { 
  ArrowLeft,
  Eye,
  ExternalLink
} from 'lucide-react';

export function OhifViewer() {
  const { project, subject, experiment } = useParams<{
    project: string;
    subject: string;
    experiment: string;
  }>();
  
  const { client } = useXnat();

  // Get the XNAT base URL for the viewer
  const xnatConfig = client?.getConfig();
  const baseURL = xnatConfig?.baseURL || '';

  const { data: experimentData } = useQuery({
    queryKey: ['experiment', project, subject, experiment],
    queryFn: () => client?.getExperiment(project!, subject!, experiment!) || null,
    enabled: !!client && !!project && !!subject && !!experiment,
  });

  const { data: subjectData } = useQuery({
    queryKey: ['subject', project, subject],
    queryFn: () => client?.getSubject(project!, subject!) || null,
    enabled: !!client && !!project && !!subject,
  });

  // Construct the OHIF viewer URL using the proxy to maintain session
  const getViewerUrl = () => {
    const subjectId = subjectData?.id || subject;
    const experimentId = experimentData?.id || experiment;
    const experimentLabel = experimentData?.label || experiment;
    
    // Use the proxy path instead of direct XNAT URL to maintain authentication
    const isDevelopment = import.meta.env.DEV;
    const proxyPath = isDevelopment ? '/api/xnat' : baseURL;
    
    return `${proxyPath}/VIEWER/?subjectId=${subjectId}&projectId=${project}&experimentId=${experimentId}&experimentLabel=${experimentLabel}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to={`/experiments/${project}/${subject}/${experiment}`}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Experiment
            </Link>
            
            <div className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">{project}</span>
              <span className="mx-2">/</span>
              <span className="font-medium text-gray-900">{subject}</span>
              <span className="mx-2">/</span>
              <span className="font-medium text-gray-900">{experimentData?.label || experiment}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              to={`/experiments/${project}/${subject}/${experiment}`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              Experiment Details
            </Link>
            
            <a
              href={getViewerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </div>
        </div>
      </div>

      {/* OHIF Viewer Link */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">OHIF Medical Image Viewer</h3>
            <p className="text-gray-600 mb-6">
              View and analyze medical images for experiment <strong>{experimentData?.label || experiment}</strong>
            </p>
            <div className="space-y-4">
              <a
                href={getViewerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Open OHIF Viewer
              </a>
              <p className="text-sm text-gray-500">
                Opens in a new window
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}