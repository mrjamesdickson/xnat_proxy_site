import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useXnat } from '../contexts/XnatContext';
import type { XnatProjectSummaryResponse, XnatTotalCounts } from '../services/xnat-api';
import { Folder, Users, FileImage, ArrowRight, ExternalLink } from 'lucide-react';

const formatCount = (value?: number): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
};

export function Dashboard() {
  const { client, currentUser, config } = useXnat();
  const baseUrl = config?.baseURL ?? '';

  const { data: counts, isLoading: countsLoading } = useQuery<XnatTotalCounts>({
    queryKey: ['dashboard-counts', baseUrl],
    queryFn: () => client.getTotalCounts(),
    enabled: Boolean(client),
    refetchOnWindowFocus: false,
  });

  const { data: projectSummary, isLoading: projectsLoading } = useQuery<XnatProjectSummaryResponse>({
    queryKey: ['dashboard-projects', baseUrl],
    queryFn: () => client.getProjectsSummary({ accessible: true, traditional: true, limit: 5 }),
    enabled: Boolean(client),
    refetchOnWindowFocus: false,
  });

  const visibleProjects = useMemo(() => projectSummary?.projects?.slice(0, 5) ?? [], [projectSummary]);

  const userName =
    currentUser?.firstname || currentUser?.firstName || currentUser?.login || currentUser?.username || 'User';

  return (
    <div className="space-y-8">
      <header className="rounded-2xl bg-white px-6 py-8 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900/80 dark:ring-slate-800">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Dashboard</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Welcome back, {userName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Your XNAT proxy portal surfaces quick statistics and shortcuts so you can dive into projects, subjects, and
          imaging sessions without leaving this interface.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/projects"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-blue-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-300">Projects</span>
            <Folder className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">
            {countsLoading && !counts ? '—' : formatCount(counts?.projects)}
          </div>
          <p className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
            Manage projects
            <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
          </p>
        </Link>

        <Link
          to="/subjects"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-blue-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-300">Subjects</span>
            <Users className="h-5 w-5 text-green-500 dark:text-green-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">
            {countsLoading && !counts ? '—' : formatCount(counts?.subjects)}
          </div>
          <p className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
            Review cohorts
            <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
          </p>
        </Link>

        <Link
          to="/experiments"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-blue-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-300">Imaging Sessions</span>
            <FileImage className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">
            {countsLoading && !counts ? '—' : formatCount(counts?.experiments)}
          </div>
          <p className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
            Explore sessions
            <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
          </p>
        </Link>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900/80 dark:ring-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recently accessed projects</h2>
          <Link
            to="/projects"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View all projects
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Pulled from
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            /data/projects?accessible=true&amp;traditional=true
          </span>
          .
        </p>

        <div className="mt-5 space-y-3">
          {projectsLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`project-skeleton-${index}`}
                className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60"
              />
            ))
          ) : visibleProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              No projects were returned by the API.
            </div>
          ) : (
            visibleProjects.map((project) => {
              const id = project.id || (project as Record<string, unknown>).ID?.toString() || project.name || '';
              const description = (project.description || '').trim();
              const remoteUri = typeof project.URI === 'string' ? project.URI : undefined;
              const remoteHref = remoteUri && baseUrl ? `${baseUrl}${remoteUri}` : undefined;

              return (
                <div
                  key={id}
                  className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-400 dark:hover:bg-blue-950/30"
                >
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/projects/${id}`}
                      className="text-base font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
                    >
                      {project.name || id}
                    </Link>
                    {remoteHref && (
                      <a
                        href={remoteHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">ID: {id}</p>
                  {description && (
                    <p className="text-sm text-slate-600 line-clamp-2 dark:text-slate-300">{description}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
