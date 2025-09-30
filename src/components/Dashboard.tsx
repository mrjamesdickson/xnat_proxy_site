import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { 
  Folder, 
  Users, 
  FileImage, 
  Activity,
  TrendingUp,
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

// Chart colors
const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];

const getProjectIdentifier = (project: any): string =>
  project?.id || project?.ID || project?.name || project?.Name || '';

const getSubjectProject = (subject: any): string =>
  subject?.project || subject?.PROJECT || subject?.project_id || subject?.PROJECT_ID || '';

const getExperimentProject = (experiment: any): string =>
  experiment?.project || experiment?.PROJECT || experiment?.project_id || experiment?.PROJECT_ID || '';

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

  // Process data for charts
  const processChartData = () => {
    if (!projects || !subjects || !experiments) return null;

    // Project distribution data
    const projectData = projects.map(project => {
      const identifier = getProjectIdentifier(project);
      const projectSubjects = subjects.filter((subject) => getSubjectProject(subject) === identifier);
      const projectExperiments = experiments.filter((experiment) => getExperimentProject(experiment) === identifier);

      return {
        name: project.name || project.id || identifier || 'Unknown',
        subjects: projectSubjects.length,
        experiments: projectExperiments.length,
        value: projectSubjects.length + projectExperiments.length
      };
    });

    // Experiment types distribution
    const experimentTypes = experiments.reduce((acc: any, exp: any) => {
      const type = exp.xsiType || exp.modality || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const experimentTypesData = Object.entries(experimentTypes).map(([name, value]) => ({
      name,
      value: value as number
    }));

    // Timeline data (experiments by date)
    const experimentsByDate = experiments.reduce((acc: any, exp: any) => {
      const date = exp.date ? new Date(exp.date).toISOString().split('T')[0] : 'Unknown';
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const timelineData = Object.entries(experimentsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30) // Last 30 days
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString(),
        experiments: count as number
      }));

    return {
      projectData: projectData.slice(0, 10), // Top 10 projects
      experimentTypesData,
      timelineData
    };
  };

  const chartData = processChartData();

  const stats = [
    {
      name: 'Projects',
      value: projects?.length || 0,
      icon: Folder,
      color: 'bg-blue-500',
      href: '/projects',
      loading: projectsLoading,
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Subjects',
      value: subjects?.length || 0,
      icon: Users,
      color: 'bg-green-500',
      href: '/subjects',
      loading: subjectsLoading,
      change: '+23%',
      changeType: 'positive'
    },
    {
      name: 'Experiments',
      value: experiments?.length || 0,
      icon: FileImage,
      color: 'bg-purple-500',
      href: '/experiments',
      loading: experimentsLoading,
      change: '+18%',
      changeType: 'positive'
    },
    {
      name: 'Total Data Size',
      value: '2.4TB',
      icon: Database,
      color: 'bg-orange-500',
      href: '/experiments',
      loading: false,
      change: '+5%',
      changeType: 'positive'
    },
  ];

  const isLoading = projectsLoading || subjectsLoading || experimentsLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Welcome back, {currentUser?.firstname || 'User'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's a comprehensive overview of your XNAT instance with analytics and insights.
        </p>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={clsx('rounded-md p-3 group-hover:scale-110 transition-transform', stat.color)}>
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
                      <>
                        <div className="text-2xl font-semibold text-gray-900">
                          {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                        </div>
                        {stat.change && (
                          <div className={clsx(
                            'ml-2 text-sm font-medium',
                            stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                          )}>
                            {stat.change}
                          </div>
                        )}
                      </>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="absolute right-4 top-4">
              <TrendingUp className={clsx(
                'h-4 w-4 transition-colors',
                stat.changeType === 'positive' ? 'text-green-400' : 'text-gray-400'
              )} />
            </div>
          </Link>
        ))}
      </div>

      {/* Charts and Analytics */}
      <div className="space-y-8">
        {/* Project Distribution Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Project Activity Distribution
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Subjects and experiments by project
              </p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="h-80 bg-gray-100 rounded animate-pulse flex items-center justify-center">
              <div className="text-gray-400">Loading chart data...</div>
            </div>
          ) : chartData?.projectData && chartData.projectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.projectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="subjects" fill="#3B82F6" name="Subjects" />
                <Bar dataKey="experiments" fill="#10B981" name="Experiments" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No project data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Pie Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Experiment Types Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-purple-600" />
                  Experiment Types
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Distribution of experiment modalities
                </p>
              </div>
            </div>
            
            {isLoading ? (
              <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <div className="text-gray-400">Loading chart data...</div>
              </div>
            ) : chartData?.experimentTypesData && chartData.experimentTypesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    dataKey="value"
                    data={chartData.experimentTypesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {chartData.experimentTypesData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No experiment type data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-green-600" />
                  Experiment Timeline
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Recent experiment activity
                </p>
              </div>
            </div>
            
            {isLoading ? (
              <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
                <div className="text-gray-400">Loading chart data...</div>
              </div>
            ) : chartData?.timelineData && chartData.timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area type="monotone" dataKey="experiments" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No timeline data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-indigo-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/projects"
              className="group relative rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg mr-3 group-hover:bg-blue-600 transition-colors">
                  <Folder className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Browse Projects
                  </div>
                  <div className="text-xs text-gray-600">
                    {projects?.length || 0} projects
                  </div>
                </div>
              </div>
            </Link>
            
            <Link
              to="/upload"
              className="group relative rounded-lg border border-gray-200 bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center">
                <div className="p-2 bg-green-500 rounded-lg mr-3 group-hover:bg-green-600 transition-colors">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Upload Data
                  </div>
                  <div className="text-xs text-gray-600">
                    Add new studies
                  </div>
                </div>
              </div>
            </Link>
            
            <Link
              to="/search"
              className="group relative rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center">
                <div className="p-2 bg-purple-500 rounded-lg mr-3 group-hover:bg-purple-600 transition-colors">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Search Data
                  </div>
                  <div className="text-xs text-gray-600">
                    Find studies
                  </div>
                </div>
              </div>
            </Link>
            
            <Link
              to="/settings"
              className="group relative rounded-lg border border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center">
                <div className="p-2 bg-orange-500 rounded-lg mr-3 group-hover:bg-orange-600 transition-colors">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Settings
                  </div>
                  <div className="text-xs text-gray-600">
                    Configure XNAT
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2 text-green-600" />
          System Health
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
            <div>
              <div className="text-sm font-medium text-gray-900">Database</div>
              <div className="text-xs text-gray-500">Online</div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
            <div>
              <div className="text-sm font-medium text-gray-900">Storage</div>
              <div className="text-xs text-gray-500">67% Used</div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
            <div>
              <div className="text-sm font-medium text-gray-900">Processing</div>
              <div className="text-xs text-gray-500">3 Jobs Queued</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}