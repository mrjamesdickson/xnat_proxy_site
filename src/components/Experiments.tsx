import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import {
  FileImage,
  Search,
  Filter,
  Calendar,
  User,
  Eye,
  Folder,
  Activity,
  Clock,
  Zap,
  Camera,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ScanSnapshot } from './ScanSnapshot';

export function Experiments() {
  const { client } = useXnat();
  const [searchParams] = useSearchParams();
  const { project: routeProject, subject: routeSubject } = useParams<{
    project: string;
    subject: string;
  }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(routeProject || searchParams.get('project') || '');
  const [selectedModality, setSelectedModality] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => client?.getProjects() || [],
    enabled: !!client,
  });

  // Fetch subjects to create a mapping for experiments that don't have subject_id
  const { data: subjects } = useQuery({
    queryKey: ['subjects', selectedProject],
    queryFn: () => selectedProject 
      ? client?.getSubjects(selectedProject) || []
      : client?.getSubjects() || [],
    enabled: !!client,
  });

  const getSubjectId = (experiment: any) => {
    // First try the direct field
    if (experiment.subject_id) {
      return experiment.subject_id;
    }
    
    // Try to find the subject by matching experiment to subject
    // This is a common pattern where experiments belong to subjects in the same project
    if (subjects && subjects.length > 0) {
      // If there's only one subject in the project, use that
      if (subjects.length === 1) {
        return subjects[0].id || subjects[0].label;
      }
      
      // Try to find subject by matching patterns or labels
      // This might need adjustment based on your XNAT setup
      const matchingSubject = subjects.find(subject => {
        // Try various matching strategies
        return experiment.label?.includes(subject.label) ||
               experiment.label?.includes(subject.id) ||
               subject.label?.includes(experiment.label) ||
               subject.id?.includes(experiment.label);
      });
      
      if (matchingSubject) {
        return matchingSubject.id || matchingSubject.label;
      }
    }
    
    // Fallback strategies
    return experiment.subject_ID || 
           experiment.subject || 
           experiment.subject_label ||
           experiment.subjectId ||
           // Try extracting from URI if available
           experiment.URI?.split('/subjects/')[1]?.split('/')[0] ||
           // Transform experiment ID pattern (if it follows XNAT_E -> XNAT_S)
           (experiment.id?.startsWith('XNAT_E') ? experiment.id.replace('XNAT_E', 'XNAT_S') : null) ||
           // Last resort: use a placeholder that indicates the issue
           'UNKNOWN_SUBJECT';
  };

  const getExperimentId = (experiment: any) => {
    // XNAT returns ID in uppercase
    return experiment.id || experiment.ID || experiment.label;
  };

  const { data: experiments, isLoading, error } = useQuery({
    queryKey: ['experiments', selectedProject, routeSubject],
    queryFn: async () => {
      try {
        let result;
        if (routeProject && routeSubject) {
          // Fetching experiments for a specific subject
          result = await client?.getExperiments(routeProject, routeSubject) || [];
        } else if (selectedProject) {
          // Fetching experiments for a specific project
          result = await client?.getExperiments(selectedProject) || [];
        } else {
          // Fetching all experiments
          result = await client?.getExperiments() || [];
        }
        console.log('✅ Successfully loaded experiments:', result?.length);
        return result;
      } catch (err) {
        console.error('❌ Error loading experiments:', err);
        throw err;
      }
    },
    enabled: !!client,
  });

  if (experiments?.[0]) {
    const sample = experiments[0];
    console.log('🔍 Debug experiment data:', {
      project: sample.project,
      subject_id: sample.subject_id,
      id: sample.id,
      label: sample.label,
      allKeys: Object.keys(sample)
    });
  }
  
  if (subjects?.[0]) {
    console.log('🔍 Debug subjects data:', {
      count: subjects.length,
      sample: subjects[0],
      allSubjects: subjects.map(s => ({ id: s.id, label: s.label }))
    });
  }
  
  const filteredExperiments = experiments?.filter(experiment => {
    const subjectId = getSubjectId(experiment);
    const experimentId = getExperimentId(experiment);
    const matchesSearch = experiment.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      experimentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModality = !selectedModality || experiment.modality?.toLowerCase() === selectedModality.toLowerCase();
    
    return matchesSearch && matchesModality;
  }) || [];
  
  console.log('Filtered experiments:', filteredExperiments);

  // Pagination calculations
  const totalItems = filteredExperiments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExperiments = filteredExperiments.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleFilterChange = (filterType: 'search' | 'project' | 'modality', value: string) => {
    setCurrentPage(1);
    switch (filterType) {
      case 'search':
        setSearchTerm(value);
        break;
      case 'project':
        setSelectedProject(value);
        break;
      case 'modality':
        setSelectedModality(value);
        break;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const modalities = experiments 
    ? [...new Set(experiments.map(exp => exp.modality).filter((m): m is string => Boolean(m)))]
    : [];

  const getModalityIcon = (modality: string | undefined) => {
    if (!modality) return FileImage;
    
    switch (modality.toLowerCase()) {
      case 'mr':
      case 'mri':
        return Activity;
      case 'ct':
        return Camera;
      case 'pet':
        return Zap;
      case 'us':
        return Activity;
      default:
        return FileImage;
    }
  };

  const getModalityColor = (modality: string | undefined) => {
    if (!modality) return 'bg-gray-100 text-gray-600';
    
    switch (modality.toLowerCase()) {
      case 'mr':
      case 'mri':
        return 'bg-blue-100 text-blue-600';
      case 'ct':
        return 'bg-green-100 text-green-600';
      case 'pet':
        return 'bg-purple-100 text-purple-600';
      case 'us':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            Failed to load experiments. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Experiments
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage imaging experiments and sessions.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-l-lg border',
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b',
                viewMode === 'table'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="Search experiments..."
            value={searchTerm}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            value={selectedProject}
            onChange={(e) => handleFilterChange('project', e.target.value)}
          >
            <option value="">All Projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name || project.id}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <select
            className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            value={selectedModality}
            onChange={(e) => handleFilterChange('modality', e.target.value)}
          >
            <option value="">All Modalities</option>
            {modalities.map((modality) => (
              <option key={modality} value={modality}>
                {modality.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Experiments Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-gray-200 rounded-lg mr-3" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="flex justify-between">
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredExperiments.length === 0 ? (
        <div className="text-center py-12">
          <FileImage className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm || selectedProject || selectedModality ? 'No experiments found' : 'No experiments'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedProject || selectedModality
              ? 'Try adjusting your search or filter criteria.'
              : 'No experiments found in your accessible projects.'
            }
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Label</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Project</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Subject</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Modality</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedExperiments.map((experiment) => {
                const subjectId = routeSubject || getSubjectId(experiment);
                const projectId = routeProject || experiment.project;
                const experimentId = getExperimentId(experiment);

                return (
                  <tr key={experimentId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      {experiment.label || experimentId}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{projectId}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{subjectId}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {experiment.modality && (
                        <span className={clsx(
                          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                          getModalityColor(experiment.modality)
                        )}>
                          {experiment.modality.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {experiment.date ? new Date(experiment.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <Link
                        to={`/experiments/${projectId}/${subjectId}/${experiment.label || experimentId}`}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedExperiments.map((experiment) => {
            const ModalityIcon = getModalityIcon(experiment.modality);
            const modalityColor = getModalityColor(experiment.modality);
            const subjectId = routeSubject || getSubjectId(experiment);
            const projectId = routeProject || experiment.project;
            const experimentId = getExperimentId(experiment);

            return (
              <div
                key={experimentId}
                className="relative group bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <Link
                  to={`/experiments/${projectId}/${subjectId}/${experiment.label || experimentId}`}
                  className="block hover:opacity-90 transition-opacity"
                >
                  <ExperimentSnapshotPreview
                    client={client}
                    projectId={projectId}
                    subjectId={subjectId}
                    experimentId={experimentId}
                  />
                </Link>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={clsx('h-10 w-10 rounded-lg flex items-center justify-center', modalityColor)}>
                        <ModalityIcon className="h-5 w-5" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {experiment.label || experimentId}
                        </h3>
                        <p className="text-xs text-gray-500">{experimentId}</p>
                      </div>
                    </div>
                    
                    {experiment.modality && (
                      <span className={clsx(
                        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                        modalityColor
                      )}>
                        {experiment.modality.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Folder className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{projectId}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{subjectId}</span>
                    </div>
                    
                    {experiment.date && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{new Date(experiment.date).toLocaleDateString()}</span>
                        {experiment.time && (
                          <span className="ml-1">• {experiment.time}</span>
                        )}
                      </div>
                    )}

                    {experiment.scanner && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Scanner:</span> {experiment.scanner}
                      </div>
                    )}

                    {experiment.session_type && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Type:</span> {experiment.session_type}
                      </div>
                    )}
                  </div>

                  {experiment.validation && (
                    <div className="mb-4">
                      <span className={clsx(
                        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                        experiment.validation.status === 'valid' 
                          ? 'bg-green-100 text-green-800'
                          : experiment.validation.status === 'questionable'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      )}>
                        <Activity className="h-3 w-3 mr-1" />
                        {experiment.validation.status}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/experiments/${projectId}/${subjectId}/${experimentId}`}
                        className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-500"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {experiment.xsiType?.replace('xnat:', '')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
          <div className="flex justify-between flex-1 sm:hidden">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                <span className="font-medium">{totalItems}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={clsx(
                        'relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0',
                        pageNum === currentPage
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {filteredExperiments.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-900/5">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Experiment Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {filteredExperiments.length}
              </div>
              <div className="text-sm text-gray-500">Total Experiments</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {new Set(filteredExperiments.map(e => e.project)).size}
              </div>
              <div className="text-sm text-gray-500">Projects</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {new Set(filteredExperiments.map(e => getSubjectId(e))).size}
              </div>
              <div className="text-sm text-gray-500">Subjects</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {new Set(filteredExperiments.map(e => e.modality)).size}
              </div>
              <div className="text-sm text-gray-500">Modalities</div>
            </div>
          </div>

          {/* Modality Breakdown */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">By Modality</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {modalities.map(modality => {
                const count = filteredExperiments.filter(e => e.modality === modality).length;
                const ModalityIcon = getModalityIcon(modality);
                const modalityColor = getModalityColor(modality);
                
                return (
                  <div key={modality} className="text-center">
                    <div className={clsx('h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-2', modalityColor)}>
                      <ModalityIcon className="h-4 w-4" />
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">{modality?.toUpperCase()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component to fetch and display the first scan snapshot for an experiment
function ExperimentSnapshotPreview({
  client,
  projectId,
  subjectId,
  experimentId
}: {
  client: any;
  projectId: string;
  subjectId: string;
  experimentId: string;
}) {
  const { data: scans } = useQuery({
    queryKey: ['experiment-scans', projectId, subjectId, experimentId],
    queryFn: async () => {
      if (!client) return [];
      try {
        const result = await client.getScans(projectId, subjectId, experimentId);
        return result || [];
      } catch (error) {
        console.error('Error fetching scans for experiment:', experimentId, error);
        return [];
      }
    },
    enabled: !!client && !!projectId && !!subjectId && !!experimentId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const firstScan = scans && scans.length > 0 ? scans[0] : null;

  // Normalize scan id (XNAT returns ID uppercase)
  const scanId = firstScan ? (firstScan.id || firstScan.ID) : null;

  const snapshotUrl = scanId && client
    ? client.getScanThumbnailUrl(projectId, subjectId, experimentId, scanId)
    : null;

  return (
    <ScanSnapshot
      snapshotUrl={snapshotUrl}
      alt={`Snapshot for ${experimentId}`}
      containerClassName="w-full aspect-square"
      showLabel={false}
    />
  );
}