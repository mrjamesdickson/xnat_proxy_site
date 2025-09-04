import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { 
  Folder, 
  Users, 
  FileImage, 
  Activity,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export function Dashboard() {
  const { client, currentUser } = useXnat();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => client?.getProjects() || [],
    enabled: !!client,
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => client?.getSubjects() || [],
    enabled: !!client,
  });

  const { data: experiments, isLoading: experimentsLoading } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => client?.getExperiments() || [],
    enabled: !!client,
  });

  const stats = [
    {
      name: 'Projects',
      value: projects?.length || 0,
      icon: Folder,
      color: 'bg-blue-500',
      href: '/projects',
      loading: projectsLoading,
    },
    {
      name: 'Subjects',
      value: subjects?.length || 0,
      icon: Users,
      color: 'bg-green-500',
      href: '/subjects',
      loading: subjectsLoading,
    },
    {
      name: 'Experiments',
      value: experiments?.length || 0,
      icon: FileImage,
      color: 'bg-purple-500',
      href: '/experiments',
      loading: experimentsLoading,
    },
    {
      name: 'Active Sessions',
      value: 1,
      icon: Activity,
      color: 'bg-orange-500',
      href: '/experiments',
      loading: false,
    },
  ];

  const recentProjects = projects?.slice(0, 5) || [];
  const recentExperiments = experiments?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Welcome back, {currentUser?.firstname}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening in your XNAT instance today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={clsx('rounded-md p-3', stat.color)}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    {stat.loading ? (
                      <div className="h-6 w-8 bg-gray-200 animate-pulse rounded" />
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value.toLocaleString()}
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="absolute right-4 top-4">
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Recent Projects
              </h3>
              <Link
                to="/projects"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            <div className="mt-6 flow-root">
              {projectsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentProjects.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentProjects.map((project) => (
                    <li key={project.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Folder className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {project.name || project.id}
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {project.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-xs text-gray-400">
                          {project.last_modified && (
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(project.last_modified).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6">
                  <Folder className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new project.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Experiments */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Recent Experiments
              </h3>
              <Link
                to="/experiments"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            <div className="mt-6 flow-root">
              {experimentsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentExperiments.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentExperiments.map((experiment) => (
                    <li key={experiment.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <FileImage className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {experiment.label || experiment.id}
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {experiment.xsiType} • {experiment.project}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-xs text-gray-400">
                          {experiment.date && (
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(experiment.date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6">
                  <FileImage className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No experiments</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No experiments found in your accessible projects.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white shadow">
        <div className="p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/projects"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center">
                <Folder className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Browse Projects
                </span>
              </div>
            </Link>
            
            <Link
              to="/upload"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-green-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Upload Data
                </span>
              </div>
            </Link>
            
            <Link
              to="/search"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-purple-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Search Data
                </span>
              </div>
            </Link>
            
            <Link
              to="/settings"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-orange-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-orange-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Settings
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}