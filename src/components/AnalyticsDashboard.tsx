import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Folder,
  Users,
  FileImage,
  Activity,
  TrendingUp,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  ChevronRight,
} from 'lucide-react';
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useXnat } from '../contexts/XnatContext';
import type { XnatProject, XnatSubject, XnatExperiment } from '../services/xnat-api';

const CHART_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];

const toRecord = (value: unknown): Record<string, unknown> =>
  (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

const getProjectIdentifier = (project: XnatProject | Record<string, unknown>): string => {
  const data = toRecord(project);
  return (
    (project as XnatProject).id ||
    (project as XnatProject).name ||
    (data.ID as string) ||
    (data.Name as string) ||
    ''
  );
};

const getSubjectProject = (subject: XnatSubject | Record<string, unknown>): string => {
  const data = toRecord(subject);
  return (
    (subject as XnatSubject).project ||
    (data.project as string) ||
    (data.PROJECT as string) ||
    (data.project_id as string) ||
    ''
  );
};

const getExperimentProject = (experiment: XnatExperiment | Record<string, unknown>): string => {
  const data = toRecord(experiment);
  return (
    (experiment as XnatExperiment).project ||
    (data.project as string) ||
    (data.PROJECT as string) ||
    (data.project_id as string) ||
    ''
  );
};

const getExperimentType = (experiment: XnatExperiment | Record<string, unknown>): string => {
  const data = toRecord(experiment);
  return (
    (experiment as XnatExperiment).xsiType ||
    (data.modality as string) ||
    (data.type as string) ||
    'Unknown'
  );
};

const getExperimentDate = (experiment: XnatExperiment | Record<string, unknown>): string => {
  const data = toRecord(experiment);
  const raw =
    (experiment as XnatExperiment).date ||
    (data.date as string) ||
    (data.DATE as string) ||
    (data.insert_date as string) ||
    '';
  if (!raw) return 'Unknown';
  const tryDate = new Date(raw);
  if (!Number.isNaN(tryDate.getTime())) {
    return tryDate.toISOString().split('T')[0];
  }
  // attempt to parse YYYYMMDD style strings
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
};

const formatCount = (value?: number): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return value.toLocaleString();
};

export function AnalyticsDashboard() {
  const { client, currentUser } = useXnat();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['analytics-projects'],
    queryFn: () => client?.getProjects() ?? [],
    enabled: Boolean(client),
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['analytics-subjects'],
    queryFn: () => client?.getSubjects() ?? [],
    enabled: Boolean(client),
  });

  const { data: experiments, isLoading: experimentsLoading } = useQuery({
    queryKey: ['analytics-experiments'],
    queryFn: () => client?.getExperiments() ?? [],
    enabled: Boolean(client),
  });

  const chartData = useMemo(() => {
    if (!projects || !subjects || !experiments) {
      return null;
    }

    const projectDistribution = projects.map((project) => {
      const identifier = getProjectIdentifier(project);
      const projectSubjects = subjects.filter((subject) => getSubjectProject(subject) === identifier);
      const projectExperiments = experiments.filter((experiment) => getExperimentProject(experiment) === identifier);

      return {
        name: project.name || identifier || 'Unknown',
        subjects: projectSubjects.length,
        experiments: projectExperiments.length,
        total: projectSubjects.length + projectExperiments.length,
      };
    });

    const experimentTypeTotals = experiments.reduce<Record<string, number>>((acc, experiment) => {
      const type = getExperimentType(experiment) || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const experimentTypes = Object.entries(experimentTypeTotals).map(([name, value]) => ({
      name,
      value,
    }));

    const experimentsByDate = experiments.reduce<Record<string, number>>((acc, experiment) => {
      const date = getExperimentDate(experiment);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const timeline = Object.entries(experimentsByDate)
      .filter(([date]) => date !== 'Unknown')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        experiments: count,
      }))
      .slice(-30);

    return {
      projectDistribution: projectDistribution.slice(0, 10),
      experimentTypes,
      timeline,
    };
  }, [projects, subjects, experiments]);

  const stats = [
    {
      label: 'Projects',
      value: projects?.length ?? 0,
      icon: Folder,
      color: 'bg-blue-500',
      href: '/projects',
      loading: projectsLoading,
    },
    {
      label: 'Subjects',
      value: subjects?.length ?? 0,
      icon: Users,
      color: 'bg-green-500',
      href: '/subjects',
      loading: subjectsLoading,
    },
    {
      label: 'Experiments',
      value: experiments?.length ?? 0,
      icon: FileImage,
      color: 'bg-purple-500',
      href: '/experiments',
      loading: experimentsLoading,
    },
    {
      label: 'Avg Experiments / Project',
      value:
        projects && experiments && projects.length > 0
          ? experiments.length / projects.length
          : 0,
      icon: Activity,
      color: 'bg-amber-500',
      href: '/experiments',
      loading: projectsLoading || experimentsLoading,
      format: (value?: number) => (value ? value.toFixed(1) : '0.0'),
    },
  ];

  const isLoading = projectsLoading || subjectsLoading || experimentsLoading;
  const welcomeName =
    currentUser?.firstname || currentUser?.firstName || currentUser?.login || currentUser?.username || 'User';

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Analytics</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Insights for {welcomeName}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Visualize project distribution, experiment modalities, and recent activity sourced directly from your XNAT
              instance.
            </p>
          </div>
          <Link
            to="/processing"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <TrendingUp className="h-4 w-4" />
            View processing status
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow"
          >
            <div className="flex items-center gap-4">
              <div className={clsx('flex h-12 w-12 items-center justify-center rounded-xl text-white', stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                {stat.loading && !stat.value ? (
                  <span className="mt-2 inline-flex h-6 w-16 animate-pulse rounded bg-slate-200" />
                ) : (
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {stat.format ? stat.format(stat.value) : formatCount(stat.value)}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" />
          </Link>
        ))}
      </section>

      {isLoading || !chartData ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Project Distribution</h2>
                <p className="text-sm text-slate-600">Subjects vs. experiments across your top projects.</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.projectDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="subjects" stackId="a" fill="#3B82F6" />
                  <Bar dataKey="experiments" stackId="a" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Experiment Modalities</h2>
                <p className="text-sm text-slate-600">Breakdown by modality or experiment type.</p>
              </div>
              <PieChartIcon className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.experimentTypes} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                    {chartData.experimentTypes.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Experiment Timeline</h2>
                <p className="text-sm text-slate-600">Last 30 recorded dates across all experiments.</p>
              </div>
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.timeline}>
                  <defs>
                    <linearGradient id="colorExperiments" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="experiments" stroke="#3B82F6" fillOpacity={1} fill="url(#colorExperiments)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Data Quality Notes</h2>
            <p className="text-sm text-slate-600">Quick reminders to keep your analytics healthy.</p>
          </div>
          <AlertCircle className="h-5 w-5 text-amber-500" />
        </div>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li>• Refresh cached counts on the processing page if metrics look stale.</li>
          <li>• Ensure modalities are tagged consistently (MR, CT, PET) to keep the pie chart meaningful.</li>
          <li>• Large time gaps in the timeline may indicate incomplete session uploads.</li>
        </ul>
      </section>
    </div>
  );
}

export default AnalyticsDashboard;
