import { useMemo } from 'react';
import type { SVGProps } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import type {
  XnatExperimentSummary,
  XnatProjectSummary,
  XnatProjectSummaryResponse,
  XnatTotalCounts,
} from '../services/xnat-api';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Folder,
  Users,
  FileImage,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

const formatCount = (value?: number): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
};

const formatDate = (value?: string): string => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const formatRole = (role?: string): string | undefined => {
  if (!role) {
    return undefined;
  }
  const normalized = role.toLowerCase();
  if (normalized === 'owners') return 'Owner';
  if (normalized === 'members') return 'Member';
  if (normalized === 'collaborators') return 'Collaborator';
  return role;
};

const formatAccess = (access?: string): string => {
  if (!access) {
    return 'Private';
  }
  return access.charAt(0).toUpperCase() + access.slice(1);
};

const getProjectId = (project: XnatProjectSummary): string =>
  project.id || (project as Record<string, unknown>).ID?.toString() || project.name || '';

const readProjectField = <T,>(project: XnatProjectSummary, key: string): T | undefined =>
  project[key] as T | undefined;

const parseTimestamp = (value?: string): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element;

interface WorkflowMeta {
  Icon: IconComponent;
  label: string;
  tone: string;
  timestamp?: string;
  isSpinning?: boolean;
}

const normalizePipelineName = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getWorkflowMeta = (experiment: XnatExperimentSummary): WorkflowMeta => {
  const pipeline = experiment.pipeline_name;
  const workflowStatus = experiment.workflow_status || '';
  const timestamp = experiment.workflow_date || experiment.action_date;

  if (pipeline) {
    const label = normalizePipelineName(pipeline);
    const statusLower = workflowStatus.toLowerCase();

    if (statusLower.startsWith('failed') && workflowStatus !== 'Failed (Dismissed)') {
      return { Icon: AlertTriangle, label, tone: 'text-red-600', timestamp };
    }
    if (workflowStatus === 'Queued') {
      return { Icon: Clock, label, tone: 'text-amber-600', timestamp };
    }
    if (workflowStatus && workflowStatus !== 'Complete') {
      return {
        Icon: Loader2,
        label: `${label} (${workflowStatus})`,
        tone: 'text-blue-600',
        timestamp,
        isSpinning: true,
      };
    }
    return { Icon: CheckCircle2, label, tone: 'text-green-600', timestamp };
  }

  if (workflowStatus) {
    const statusLower = workflowStatus.toLowerCase();
    const statusTimestamp = timestamp || experiment.last_modified || experiment.insert_date;

    if (statusLower.startsWith('failed') && workflowStatus !== 'Failed (Dismissed)') {
      return { Icon: AlertTriangle, label: workflowStatus, tone: 'text-red-600', timestamp: statusTimestamp };
    }
    if (workflowStatus === 'Queued') {
      return { Icon: Clock, label: workflowStatus, tone: 'text-amber-600', timestamp: statusTimestamp };
    }
    if (workflowStatus === 'Complete') {
      return { Icon: CheckCircle2, label: 'Complete', tone: 'text-green-600', timestamp: statusTimestamp };
    }
    return {
      Icon: Loader2,
      label: workflowStatus,
      tone: 'text-blue-600',
      timestamp: statusTimestamp,
      isSpinning: true,
    };
  }

  if (experiment.last_modified) {
    return { Icon: Clock, label: 'Modified', tone: 'text-slate-600', timestamp: experiment.last_modified };
  }

  return { Icon: CheckCircle2, label: 'Created', tone: 'text-slate-500', timestamp: experiment.insert_date };
};

export function LegacyIndex() {
  const { client, currentUser, config } = useXnat();

  const baseUrl = config?.baseURL ?? '';

  const {
    data: counts,
    isLoading: countsLoading,
    isFetching: countsRefreshing,
    refetch: refetchCounts,
  } = useQuery<XnatTotalCounts>({
    queryKey: ['total-counts', baseUrl],
    queryFn: () => client.getTotalCounts(),
    enabled: Boolean(client),
    refetchOnWindowFocus: false,
  });

  const {
    data: projectSummary,
    isLoading: projectsLoading,
  } = useQuery<XnatProjectSummaryResponse>({
    queryKey: ['home-projects', baseUrl],
    queryFn: () => client.getProjectsSummary({ accessible: true, traditional: true }),
    enabled: Boolean(client),
    refetchOnWindowFocus: false,
  });

  const {
    data: recentExperiments,
    isLoading: experimentsLoading,
  } = useQuery<XnatExperimentSummary[]>({
    queryKey: ['recent-experiments', baseUrl],
    queryFn: () => client.getRecentExperiments(20),
    enabled: Boolean(client),
    refetchOnWindowFocus: false,
  });

  const sortedProjects = useMemo(() => {
    if (!projectSummary?.projects?.length) {
      return [] as XnatProjectSummary[];
    }
    const accessKey = projectSummary.userId ? `last_accessed_${projectSummary.userId}` : 'last_accessed';
    return [...projectSummary.projects].sort((a, b) =>
      parseTimestamp(readProjectField<string>(b, accessKey)) - parseTimestamp(readProjectField<string>(a, accessKey))
    );
  }, [projectSummary]);

  const visibleProjects = useMemo(() => sortedProjects.slice(0, 6), [sortedProjects]);

  const recentActivity = useMemo(
    () => (recentExperiments ? recentExperiments.slice(0, 12) : []),
    [recentExperiments]
  );

  const countsText = counts
    ? `XNAT currently contains ${formatCount(counts.projects)} projects, ${formatCount(counts.subjects)} subjects, and ${formatCount(counts.experiments)} imaging sessions.`
    : countsLoading
    ? 'Loading system counts...'
    : 'Unable to load system counts.';

  const welcomeName =
    currentUser?.firstname || currentUser?.firstName || currentUser?.login || currentUser?.username || 'User';

  const statCards = [
    {
      name: 'Projects',
      value: counts?.projects,
      icon: Folder,
      href: '/projects',
    },
    {
      name: 'Subjects',
      value: counts?.subjects,
      icon: Users,
      href: '/subjects',
    },
    {
      name: 'Imaging Sessions',
      value: counts?.experiments,
      icon: FileImage,
      href: '/experiments',
    },
  ];

  const quickLinks = [
    {
      name: 'Subjects',
      description: 'Review enrolled subjects across all active projects.',
      href: '/subjects',
      icon: Users,
    },
    {
      name: 'Experiments',
      description: 'Browse recent imaging sessions and derived resources.',
      href: '/experiments',
      icon: FileImage,
    },
    {
      name: 'Administer',
      description: 'Manage users, groups, and site settings from the admin console.',
      href: '/admin/users',
      icon: Folder,
    },
  ];

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
        <div className="px-6 py-8 sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-500">Home</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                Welcome back, {welcomeName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                This landing page mirrors the legacy XNAT index screen. Data below is sourced directly from the
                platform&apos;s REST services, so you can gauge system health before diving into detailed workflows.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetchCounts()}
              disabled={!client || countsRefreshing}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {countsRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh counts
            </button>
          </div>

          <div className="mt-6 text-sm text-slate-600">
            {countsLoading && !counts ? (
              <span className="inline-flex h-4 w-48 animate-pulse rounded bg-slate-200" />
            ) : (
              countsText
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map((card) => (
              <Link
                key={card.name}
                to={card.href}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.name}</p>
                    {countsLoading && !counts ? (
                      <span className="mt-2 inline-flex h-6 w-16 animate-pulse rounded bg-slate-200" />
                    ) : (
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {formatCount(card.value)}
                      </p>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400 transition group-hover:text-blue-500" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <div className="px-6 py-6 sm:px-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
              <Link to="/projects" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Browse all
              </Link>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Listing generated from <span className="font-mono text-xs text-slate-500">/data/projects?accessible=true&amp;traditional=true</span>.
              Projects are ordered by your most recent activity.
            </p>

            <div className="mt-6 space-y-4">
              {projectsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`project-skeleton-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                  </div>
                ))
              ) : visibleProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No accessible projects were returned by the `/data/projects` endpoint.
                </div>
              ) : (
                visibleProjects.map((project) => {
                  const projectId = getProjectId(project);
                  const roleKey = projectSummary?.userId ? `user_role_${projectSummary.userId}` : undefined;
                  const role = roleKey ? formatRole(readProjectField<string>(project, roleKey)) : undefined;
                  const accessKey = projectSummary?.userId ? `last_accessed_${projectSummary.userId}` : 'last_accessed';
                  const lastAccessed = readProjectField<string>(project, accessKey);
                  const remoteUri = typeof project.URI === 'string' ? project.URI : undefined;
                  const remoteHref = remoteUri && baseUrl ? `${baseUrl}${remoteUri}` : undefined;
                  const description = (project.description || '').trim();

                  return (
                    <div
                      key={projectId}
                      className="rounded-2xl border border-slate-200 bg-slate-50/75 p-5 transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/projects/${projectId}`}
                              className="text-base font-semibold text-slate-900 hover:text-blue-600"
                            >
                              {project.name || projectId}
                            </Link>
                            {remoteHref && (
                              <a
                                href={remoteHref}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-blue-500"
                                aria-label="Open in XNAT"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                            Project ID: {projectId}
                          </p>
                        </div>
                      </div>

                      {description && (
                        <p className="mt-3 text-sm text-slate-600 line-clamp-3">{description}</p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">Access: {formatAccess(project.project_access)}</span>
                        {role && <span>{role}</span>}
                        <span>Last accessed: {lastAccessed ? formatDateTime(lastAccessed) : 'Never'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <div className="px-6 py-6 sm:px-8">
            <h2 className="text-lg font-semibold text-slate-900">Quick Navigation</h2>
            <p className="mt-2 text-sm text-slate-600">
              Shortcut tiles for the most common workflows. All links stay within this React interface.
            </p>

            <div className="mt-6 space-y-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{link.name}</p>
                    <p className="mt-1 text-xs text-slate-600">{link.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
        <div className="px-6 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Data Activity</h2>
            <Link to="/experiments" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all sessions
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Feed generated from <span className="font-mono text-xs text-slate-500">/data/experiments?recent=true</span> and trimmed to the latest events.
          </p>

          <div className="mt-6 overflow-x-auto">
            {experimentsLoading ? (
              <table className="min-w-full divide-y divide-slate-200">
                <tbody className="divide-y divide-slate-200">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`recent-skeleton-${index}`} className="bg-white">
                      <td className="px-4 py-4">
                        <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : recentActivity.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No recent experiment activity was returned by the `/data/experiments` endpoint.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
                  {recentActivity.map((experiment) => {
                    const workflow = getWorkflowMeta(experiment);
                    const sessionLabel = experiment.label || experiment.id;

                    return (
                      <tr key={experiment.id} className="align-top">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{experiment.project}</span>
                        </td>
                        <td className="px-4 py-3">
                          {experiment.type_desc || experiment.xsiType || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate(experiment.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{sessionLabel}</span>
                          <div className="text-xs text-slate-500">
                            ID: {experiment.id}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={clsx(
                                'flex h-8 w-8 items-center justify-center rounded-full bg-slate-100',
                                workflow.tone
                              )}
                            >
                              <workflow.Icon
                                className={clsx('h-4 w-4', workflow.isSpinning && 'animate-spin')}
                              />
                            </span>
                            <div>
                              <div className="font-medium text-slate-900">{workflow.label}</div>
                              <div className="text-xs text-slate-500">
                                {formatDateTime(workflow.timestamp)}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
