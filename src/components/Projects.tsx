import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { 
  Folder, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Users, 
  FileImage,
  Eye,
  Calendar,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

function getProjectId(project: any): string {
  return project.id || project.ID || project.name || project.Name || '';
}

export function Projects() {
  const { client } = useXnat();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => client?.getProjects() || [],
    enabled: !!client,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => client!.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const filteredProjects = projects?.filter(project =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProjectId(project)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDeleteProject = async (project: any) => {
    const projectId = getProjectId(project);
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await deleteProjectMutation.mutateAsync(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            Failed to load projects. Please try again later.
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
            Projects
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your XNAT projects and their data.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            New Project
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
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4" />
              <div className="h-3 bg-gray-200 rounded mb-2 w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="mt-4 flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? 'No projects found' : 'No projects'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search terms.' 
              : 'Get started by creating your first project.'
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={getProjectId(project)}
              className="relative group bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Folder className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {project.name || getProjectId(project)}
                      </h3>
                      <p className="text-xs text-gray-500">{getProjectId(project)}</p>
                    </div>
                  </div>
                  
                  <div className="relative group/menu">
                    <button className="p-2 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-10">
                      <Link
                        to={`/projects/${getProjectId(project)}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 mr-3" />
                        View Details
                      </Link>
                      <Link
                        to={`/subjects?project=${getProjectId(project)}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Users className="w-4 h-4 mr-3" />
                        View Subjects
                      </Link>
                      <Link
                        to={`/experiments?project=${getProjectId(project)}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FileImage className="w-4 h-4 mr-3" />
                        View Experiments
                      </Link>
                      <button
                        onClick={() => handleDeleteProject(project)}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Delete Project
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {project.description || 'No description available'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    <span>
                      {project.pi_firstname && project.pi_lastname
                        ? `${project.pi_firstname} ${project.pi_lastname}`
                        : 'No PI assigned'
                      }
                    </span>
                  </div>
                  
                  {project.last_modified && (
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{new Date(project.last_modified).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={clsx(
                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                    project.accessibility === 'public'
                      ? 'bg-green-100 text-green-800'
                      : project.accessibility === 'protected'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  )}>
                    {project.accessibility || 'private'}
                  </span>
                  
                  <Link
                    to={`/projects/${getProjectId(project)}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const { client } = useXnat();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    pi_firstname: '',
    pi_lastname: '',
    accessibility: 'private',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id.trim() || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await client!.createProject(formData);
      onSuccess();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Create New Project</h3>
          </div>
          
          <div className="px-6 py-4 space-y-4">
            <div>
              <label htmlFor="project-id" className="block text-sm font-medium text-gray-700">
                Project ID *
              </label>
              <input
                type="text"
                id="project-id"
                required
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="unique-project-id"
              />
            </div>
            
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
                Project Name *
              </label>
              <input
                type="text"
                id="project-name"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="My Research Project"
              />
            </div>
            
            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="project-description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Project description..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pi-firstname" className="block text-sm font-medium text-gray-700">
                  PI First Name
                </label>
                <input
                  type="text"
                  id="pi-firstname"
                  value={formData.pi_firstname}
                  onChange={(e) => setFormData(prev => ({ ...prev, pi_firstname: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="pi-lastname" className="block text-sm font-medium text-gray-700">
                  PI Last Name
                </label>
                <input
                  type="text"
                  id="pi-lastname"
                  value={formData.pi_lastname}
                  onChange={(e) => setFormData(prev => ({ ...prev, pi_lastname: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="accessibility" className="block text-sm font-medium text-gray-700">
                Accessibility
              </label>
              <select
                id="accessibility"
                value={formData.accessibility}
                onChange={(e) => setFormData(prev => ({ ...prev, accessibility: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="private">Private</option>
                <option value="protected">Protected</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.id.trim() || !formData.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}