import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { 
  ArrowLeft,
  User,
  Folder,
  Calendar,
  FileImage,
  Eye,
  Activity
} from 'lucide-react';

export function SubjectDetail() {
  const { project, subject } = useParams<{
    project: string;
    subject: string;
  }>();
  
  const { client } = useXnat();

  const { data: subjectData, isLoading, error } = useQuery({
    queryKey: ['subject', project, subject],
    queryFn: () => client?.getSubject(project!, subject!) || null,
    enabled: !!client && !!project && !!subject,
  });

  const { data: experiments } = useQuery({
    queryKey: ['experiments', project, subject],
    queryFn: () => client?.getExperiments(project!, subject!) || [],
    enabled: !!client && !!project && !!subject,
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            Failed to load subject details. Please try again later.
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
          <p className="text-gray-600">Loading subject details...</p>
        </div>
      </div>
    );
  }

  const getSubjectId = (subject: any) => {
    return subject?.id || subject?.ID || subject?.subject_id || subject?.subject_ID || subject?.label;
  };

  const subjectId = getSubjectId(subjectData) || subject;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link to="/subjects" className="hover:text-gray-700">Subjects</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{project}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{subject}</span>
      </nav>

      {/* Back Button */}
      <div>
        <Link
          to="/subjects"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subjects
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900">
                {subjectData?.label || subject}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Subject ID: {subjectId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Details */}
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
              
              {subjectData?.group && (
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Group</div>
                    <div className="text-sm text-gray-500">{subjectData.group}</div>
                  </div>
                </div>
              )}
              
              {subjectData?.insert_date && (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Created</div>
                    <div className="text-sm text-gray-500">
                      {new Date(subjectData.insert_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}

              {subjectData?.insert_user && (
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Created By</div>
                    <div className="text-sm text-gray-500">{subjectData.insert_user}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Demographics */}
          {(subjectData?.gender || subjectData?.age || subjectData?.handedness || subjectData?.dob) && (
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
              <h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
                Demographics
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjectData?.gender && (
                  <div>
                    <div className="text-sm font-medium text-gray-900">Gender</div>
                    <div className="text-sm text-gray-500">{subjectData.gender}</div>
                  </div>
                )}

                {subjectData?.age && (
                  <div>
                    <div className="text-sm font-medium text-gray-900">Age</div>
                    <div className="text-sm text-gray-500">{subjectData.age} years</div>
                  </div>
                )}

                {subjectData?.handedness && (
                  <div>
                    <div className="text-sm font-medium text-gray-900">Handedness</div>
                    <div className="text-sm text-gray-500">{subjectData.handedness}</div>
                  </div>
                )}

                {subjectData?.dob && (
                  <div>
                    <div className="text-sm font-medium text-gray-900">Date of Birth</div>
                    <div className="text-sm text-gray-500">
                      {new Date(subjectData.dob).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Experiments */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold leading-6 text-gray-900">
                Experiments ({experiments?.length || 0})
              </h2>
              <Link
                to={`/subjects/${project}/${subject}/experiments`}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <Eye className="h-4 w-4 mr-1" />
                View All Experiments
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
                      to={`/subjects/${project}/${subject}/experiments`}
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
          {/* Actions */}
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              <Link
                to={`/subjects/${project}/${subject}/experiments`}
                className="block w-full text-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                View Experiments
              </Link>
            </div>
          </div>

          {/* Additional Info */}
          {(subjectData?.height || subjectData?.weight || subjectData?.race || subjectData?.ethnicity) && (
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h3>
              <div className="space-y-3 text-sm">
                {subjectData?.height && (
                  <div>
                    <div className="text-gray-500">Height</div>
                    <div className="text-gray-900">{subjectData.height}</div>
                  </div>
                )}
                
                {subjectData?.weight && (
                  <div>
                    <div className="text-gray-500">Weight</div>
                    <div className="text-gray-900">{subjectData.weight}</div>
                  </div>
                )}

                {subjectData?.race && (
                  <div>
                    <div className="text-gray-500">Race</div>
                    <div className="text-gray-900">{subjectData.race}</div>
                  </div>
                )}

                {subjectData?.ethnicity && (
                  <div>
                    <div className="text-gray-500">Ethnicity</div>
                    <div className="text-gray-900">{subjectData.ethnicity}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}