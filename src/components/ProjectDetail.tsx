import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { 
  ArrowLeft,
  Folder,
  Users,
  FileImage,
  User,
  Calendar,
  Activity,
  Eye
} from 'lucide-react';

export function ProjectDetail() {
  const { project } = useParams<{
    project: string;
  }>();
  
  const { client } = useXnat();

  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', project],
    queryFn: () => client?.getProject(project!) || null,
    enabled: !!client && !!project,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', project],
    queryFn: () => client?.getSubjects(project!) || [],
    enabled: !!client && !!project,
  });

  const { data: experiments } = useQuery({
    queryKey: ['experiments', project],
    queryFn: () => client?.getExperiments(project!) || [],
    enabled: !!client && !!project,
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            Failed to load project details. Please try again later.
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
          <p className="text-gray-600">Loading project details...</p>
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
        <span className="text-gray-900 font-medium">{project}</span>
      </nav>

      {/* Back Button */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Folder className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900">
                {projectData?.name || project}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Project ID: {project}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-semibold text-gray-900">
                {subjects?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Subjects</div>
            </div>
          </div>
          <div className="mt-4">
            <Link
              to={`/subjects?project=${project}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all subjects →
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileImage className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-semibold text-gray-900">
                {experiments?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Experiments</div>
            </div>
          </div>
          <div className="mt-4">
            <Link
              to={`/experiments?project=${project}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all experiments →
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-semibold text-gray-900">
                {projectData?.accessibility || 'private'}
              </div>
              <div className="text-sm text-gray-500">Accessibility</div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
              Project Information
            </h2>
            
            <div className="space-y-4">
              {projectData?.description && (
                <div>
                  <div className="text-sm font-medium text-gray-900">Description</div>
                  <div className="text-sm text-gray-600 mt-1">{projectData.description}</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(projectData?.pi_firstname || projectData?.pi_lastname) && (
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Principal Investigator</div>
                      <div className="text-sm text-gray-500">
                        {projectData?.pi_firstname} {projectData?.pi_lastname}
                      </div>
                    </div>
                  </div>
                )}

                {projectData?.last_modified && (
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Last Modified</div>
                      <div className="text-sm text-gray-500">
                        {new Date(projectData.last_modified).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold leading-6 text-gray-900">
                Recent Experiments
              </h2>
              <Link
                to={`/experiments?project=${project}`}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <Eye className="h-4 w-4 mr-1" />
                View All
              </Link>
            </div>
            
            {experiments && experiments.length > 0 ? (
              <div className="space-y-3">
                {experiments.slice(0, 5).map((experiment: any) => (
                  <div key={experiment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FileImage className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {experiment.label || experiment.id}
                        </div>
                        <div className="text-xs text-gray-500">
                          {experiment.modality && `${experiment.modality} • `}
                          {experiment.date ? new Date(experiment.date).toLocaleDateString() : 'No date'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {experiments.length > 5 && (
                  <div className="text-center pt-2">
                    <Link
                      to={`/experiments?project=${project}`}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      View {experiments.length - 5} more experiments...
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <FileImage className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <div className="text-sm">No experiments found</div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to={`/subjects?project=${project}`}
                className="block w-full text-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                View Subjects
              </Link>
              
              <Link
                to={`/experiments?project=${project}`}
                className="block w-full text-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                View Experiments
              </Link>

              <Link
                to="/upload"
                className="block w-full text-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Upload Data
              </Link>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Details</h3>
            <div className="space-y-3 text-sm">
              {projectData?.secondary_id && (
                <div>
                  <div className="text-gray-500">Secondary ID</div>
                  <div className="text-gray-900">{projectData.secondary_id}</div>
                </div>
              )}
              
              <div>
                <div className="text-gray-500">Accessibility</div>
                <div className="text-gray-900 capitalize">{projectData?.accessibility || 'private'}</div>
              </div>

              <div>
                <div className="text-gray-500">Project ID</div>
                <div className="text-gray-900 font-mono text-xs">{project}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}