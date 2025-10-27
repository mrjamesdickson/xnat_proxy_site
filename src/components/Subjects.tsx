import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { useMorpheusPreferences } from '../contexts/MorpheusPreferencesContext';
import {
  Users,
  Search,
  Filter,
  User,
  FileImage,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
  Clock
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

export function Subjects() {
  const { client, config } = useXnat();
  const { getLayout, setLayout } = useMorpheusPreferences();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(searchParams.get('project') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);
  const viewMode = getLayout('subjects');
  const [showAccessRequestModal, setShowAccessRequestModal] = useState(false);
  const [requestAccessLevel, setRequestAccessLevel] = useState('member');
  const [requestComments, setRequestComments] = useState('');

  const getSubjectId = (subject: any) => {
    return subject.id || subject.ID || subject.subject_id || subject.subject_ID || subject.label;
  };

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => client?.getProjects() || [],
    enabled: !!client,
  });

  const { data: subjects, isLoading, error } = useQuery({
    queryKey: ['subjects', selectedProject],
    queryFn: () => client?.getSubjects(selectedProject) || [],
    enabled: !!client && !!selectedProject,
  });

  const filteredSubjects = subjects?.filter(subject => {
    const subjectId = getSubjectId(subject);
    return subject.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.group?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  // Pagination calculations
  const totalItems = filteredSubjects.length;
  const effectiveItemsPerPage = itemsPerPage === 'all' ? totalItems : itemsPerPage;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const endIndex = itemsPerPage === 'all' ? totalItems : startIndex + effectiveItemsPerPage;
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleFilterChange = (filterType: 'search' | 'project', value: string) => {
    setCurrentPage(1);
    switch (filterType) {
      case 'search':
        setSearchTerm(value);
        break;
      case 'project':
        setSelectedProject(value);
        break;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number | 'all') => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleRequestAccess = async () => {
    if (!selectedProject || !client) return;

    try {
      // Use XNAT's RequestAccess endpoint with form data
      const formData = new URLSearchParams();
      formData.append('project', selectedProject);
      formData.append('access_level', requestAccessLevel);
      if (requestComments.trim()) {
        formData.append('comments', requestComments.trim());
      }

      const response = await client.getHttpClient().post('/app/action/RequestAccess', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.status === 200 || response.status === 302) {
        setShowAccessRequestModal(false);
        setRequestComments('');
        setRequestAccessLevel('member');
        alert(`✓ Access request submitted for project: ${selectedProject}\n\nYour request will be reviewed by the project administrators.`);
      }
    } catch (error: any) {
      console.error('Failed to request access:', error);

      // Fallback: provide instructions to user
      const message = `Failed to submit access request automatically.\n\n` +
        `To request access to project "${selectedProject}":\n\n` +
        `1. Contact your XNAT administrator\n` +
        `2. Or visit: ${config?.baseURL || window.location.origin}/app/action/RequestAccess\n\n` +
        `Project: ${selectedProject}`;

      alert(message);
      setShowAccessRequestModal(false);
    }
  };

  // Check if error is a permission error (403)
  const isPermissionError = error && (error as any).response?.status === 403;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Subjects
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage subjects across your projects.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 flex items-center gap-3">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setLayout('subjects', 'grid')}
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
              onClick={() => setLayout('subjects', 'table')}
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
          <button
            type="button"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            New Subject
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {filteredSubjects.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-900/5">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Subject Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {filteredSubjects.length}
              </div>
              <div className="text-sm text-gray-500">Total Subjects</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {new Set(filteredSubjects.map(s => s.project)).size}
              </div>
              <div className="text-sm text-gray-500">Projects</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {filteredSubjects.filter(s => s.gender === 'M').length}
              </div>
              <div className="text-sm text-gray-500">Male</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {filteredSubjects.filter(s => s.gender === 'F').length}
              </div>
              <div className="text-sm text-gray-500">Female</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="Search subjects..."
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
            required
          >
            <option value="">Select a project...</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name || project.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subjects Table */}
      {!selectedProject ? (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <div className="text-center py-12">
            <Filter className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select a project</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please select a project from the dropdown above to view subjects.
            </p>
          </div>
        </div>
      ) : isPermissionError ? (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <div className="text-center py-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Access Required</h3>
            <p className="mt-2 text-sm text-gray-500">
              You don't have permission to view subjects in the <strong>{selectedProject}</strong> project.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAccessRequestModal(true)}
                className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Request Access
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Or contact your XNAT administrator to request access to this project.
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <div className="text-center py-12">
            <div className="rounded-md bg-red-50 p-4 mx-auto max-w-md">
              <div className="text-sm text-red-700">
                Failed to load subjects. Please try again later.
              </div>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No subjects found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'No subjects found in this project.'
              }
            </p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Demographics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experiments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedSubjects.map((subject) => {
                  const subjectId = getSubjectId(subject);
                  return (
                  <tr key={subjectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium">
                            <Link
                              to={`/subjects/${subject.project}/${subjectId}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {subject.label || subjectId}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {subjectId}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <Link
                          to={`/projects/${subject.project}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {subject.project}
                        </Link>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {subject.gender && (
                          <span className="inline-flex items-center">
                            {subject.gender}
                            {subject.age && `, ${subject.age}y`}
                          </span>
                        )}
                        {!subject.gender && !subject.age && (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </div>
                      {subject.handedness && (
                        <div className="text-xs text-gray-500">
                          {subject.handedness} handed
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subject.group ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {subject.group}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/subjects/${subject.project}/${subjectId}/experiments`}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-500"
                      >
                        <FileImage className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/subjects/${subject.project}/${subjectId}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
          /* Grid View */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedSubjects.map((subject) => {
              const subjectId = getSubjectId(subject);
              return (
                <div key={subjectId} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">
                        {subject.label || subjectId}
                      </h3>
                      <p className="text-xs text-gray-500">ID: {subjectId}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileImage className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{subject.project}</span>
                    </div>

                    {(subject.gender || subject.age) && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Demographics:</span>{' '}
                        {subject.gender && subject.gender}
                        {subject.age && `, ${subject.age}y`}
                      </div>
                    )}

                    {subject.group && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Group:</span> {subject.group}
                      </div>
                    )}

                    {subject.insert_date && (
                      <div className="text-sm text-gray-500">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {new Date(subject.insert_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-500">
                      {subject.num_experiments || 0} experiments
                    </span>
                    <Link
                      to={`/subjects/${subject.project}/${subjectId}`}
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
      )}

      {/* Pagination Controls */}
      {totalItems > 0 && (
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
                onChange={(e) => {
                  const value = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  handleItemsPerPageChange(value);
                }}
                className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
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

      {/* Access Request Modal */}
      {showAccessRequestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowAccessRequestModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <User className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                      Request Access to {selectedProject}
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="access-level" className="block text-sm font-medium text-gray-700">
                          Access Level
                        </label>
                        <select
                          id="access-level"
                          value={requestAccessLevel}
                          onChange={(e) => setRequestAccessLevel(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm shadow-sm ring-1 ring-inset ring-gray-300"
                        >
                          <option value="member">Member</option>
                          <option value="collaborator">Collaborator</option>
                          <option value="owner">Owner</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Select the level of access you need
                        </p>
                      </div>
                      <div>
                        <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                          Comments (Optional)
                        </label>
                        <textarea
                          id="comments"
                          rows={3}
                          value={requestComments}
                          onChange={(e) => setRequestComments(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ring-1 ring-inset ring-gray-300 px-3 py-2"
                          placeholder="Explain why you need access to this project..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <button
                  type="button"
                  onClick={handleRequestAccess}
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto"
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAccessRequestModal(false);
                    setRequestComments('');
                    setRequestAccessLevel('member');
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}