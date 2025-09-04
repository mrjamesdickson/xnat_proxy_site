import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { 
  Users, 
  Search, 
  Filter,
  User,
  FileImage,
  Eye,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Subjects() {
  const { client } = useXnat();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

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
    queryFn: () => selectedProject 
      ? client?.getSubjects(selectedProject) || []
      : client?.getSubjects() || [],
    enabled: !!client,
  });

  const filteredSubjects = subjects?.filter(subject => {
    const subjectId = getSubjectId(subject);
    return subject.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.group?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            Failed to load subjects. Please try again later.
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
            Subjects
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage subjects across your projects.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            New Subject
          </button>
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
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name || project.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8">
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
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || selectedProject ? 'No subjects found' : 'No subjects'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedProject
                ? 'Try adjusting your search or filter criteria.'
                : 'No subjects found in your accessible projects.'
              }
            </p>
          </div>
        ) : (
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
                {filteredSubjects.map((subject) => {
                  const subjectId = getSubjectId(subject);
                  return (
                  <tr key={subjectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {subject.label || subjectId}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {subjectId}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subject.project}</div>
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
        )}
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
    </div>
  );
}