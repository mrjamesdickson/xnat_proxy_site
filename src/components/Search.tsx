import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  ChevronDown,
  Clock,
  Filter,
  FileImage,
  Folder,
  Loader2,
  Search as SearchIcon,
  User,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useXnat } from '../contexts/XnatContext';
import clsx from 'clsx';

type SearchType = 'all' | 'projects' | 'subjects' | 'experiments';

interface SearchParams {
  term: string;
  type: SearchType;
  projectId?: string;
  subjectId?: string;
  includeId: boolean;
  includeLabel: boolean;
  includeDescription: boolean;
  includeMetadata: boolean;
  dateFrom?: string;
  dateTo?: string;
}

interface RecentSearch extends SearchParams {
  timestamp: number;
}

type ResultType = Exclude<SearchType, 'all'>;

interface SearchResultGroup<T = any> {
  type: ResultType;
  results: T[];
}

const RECENT_SEARCH_STORAGE_KEY = 'xnat_recent_searches';

function normalizeText(value?: string | number | null): string {
  if (value === undefined || value === null) return '';
  return String(value).toLowerCase();
}

function getProjectId(project: any): string {
  return project?.id || project?.ID || project?.name || project?.Name || '';
}

function getProjectName(project: any): string {
  return project?.name || project?.Name || getProjectId(project) || 'Unnamed project';
}

function getSubjectId(subject: any): string {
  return subject?.id || subject?.ID || subject?.label || subject?.Label || '';
}

function getSubjectProjectId(subject: any): string {
  return subject?.project || subject?.PROJECT || subject?.project_id || subject?.PROJECT_ID || '';
}

function getExperimentId(experiment: any): string {
  return experiment?.id || experiment?.ID || experiment?.label || experiment?.Label || '';
}

function getExperimentProjectId(experiment: any): string {
  return (
    experiment?.project ||
    experiment?.PROJECT ||
    experiment?.project_id ||
    experiment?.PROJECT_ID ||
    ''
  );
}

function getExperimentSubjectId(experiment: any): string {
  return (
    experiment?.subject_id ||
    experiment?.subjectId ||
    experiment?.SUBJECT_ID ||
    experiment?.subject_label ||
    ''
  );
}

function getExperimentLabel(experiment: any): string {
  return experiment?.label || experiment?.Label || getExperimentId(experiment) || 'Session';
}

function getExperimentModality(experiment: any): string {
  return (
    experiment?.modality ||
    experiment?.session_type ||
    experiment?.xsiType ||
    experiment?.['xsi:type'] ||
    ''
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text: string | undefined, term: string): ReactNode {
  if (!text) return '';
  if (!term) return text;

  const escapedTerm = escapeRegExp(term);
  const regex = new RegExp(`(${escapedTerm})`, 'ig');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="bg-yellow-200 text-gray-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function filterByTerm(
  data: any[] | undefined,
  params: SearchParams,
  matcher: (item: any) => string[],
  additionalPredicate?: (item: any) => boolean
): any[] {
  if (!data) return [];

  const term = params.term.trim().toLowerCase();
  return data.filter((item) => {
    if (additionalPredicate && !additionalPredicate(item)) {
      return false;
    }

    if (!term) {
      return true;
    }

    const haystacks = matcher(item).filter(Boolean).map(normalizeText);
    return haystacks.some((value) => value.includes(term));
  });
}

export function Search() {
  const { client } = useXnat();

  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [includeId, setIncludeId] = useState(true);
  const [includeLabel, setIncludeLabel] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch projects for dropdown filters
  const { data: allProjects } = useQuery({
    queryKey: ['search', 'projects-options'],
    queryFn: () => client!.getProjects(),
    enabled: !!client,
    staleTime: 1000 * 60 * 5,
  });

  const { data: projectSubjects } = useQuery({
    queryKey: ['search', 'subjects-options', projectFilter],
    queryFn: () => client!.getSubjects(projectFilter),
    enabled: !!client && !!projectFilter,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentSearch[];
        setRecentSearches(parsed);
      }
    } catch (error) {
      console.warn('Unable to load recent searches:', error);
    }
  }, []);

  const typeLabels: Record<ResultType, string> = useMemo(
    () => ({
      projects: 'Projects',
      subjects: 'Subjects',
      experiments: 'Experiments',
    }),
    []
  );

  const getTypeLabel = (type: SearchType): string =>
    type === 'all' ? 'All data' : typeLabels[type];

  const preparedParams = useMemo(() => {
    if (!searchParams) return null;
    return {
      ...searchParams,
      projectId: searchParams.projectId || undefined,
      subjectId: searchParams.subjectId || undefined,
    };
  }, [searchParams]);

  const searchQuery = useQuery<SearchResultGroup[]>({
    queryKey: ['search', 'results', preparedParams],
    enabled: !!client && !!preparedParams,
    queryFn: async () => {
      if (!client || !preparedParams) return [];

      const typesToFetch: Exclude<SearchType, 'all'>[] =
        preparedParams.type === 'all'
          ? ['projects', 'subjects', 'experiments']
          : [preparedParams.type];

      const results = await Promise.all<SearchResultGroup>(
        typesToFetch.map(async (type) => {
          switch (type) {
            case 'projects': {
              const data = await client.getProjects();
              const filtered = filterByTerm(
                data,
                preparedParams,
                (project) => [
                  preparedParams.includeId ? getProjectId(project) : '',
                  preparedParams.includeLabel ? getProjectName(project) : '',
                  preparedParams.includeDescription ? project?.description : '',
                  preparedParams.includeMetadata ? project?.pi_firstname : '',
                  preparedParams.includeMetadata ? project?.pi_lastname : '',
                ]
              );
              return { type, results: filtered };
            }
            case 'subjects': {
              const data = await client.getSubjects(preparedParams.projectId);
              const filtered = filterByTerm(
                data,
                preparedParams,
                (subject) => [
                  preparedParams.includeId ? getSubjectId(subject) : '',
                  preparedParams.includeLabel ? subject?.label : '',
                  preparedParams.includeDescription ? subject?.group : '',
                  preparedParams.includeMetadata ? subject?.gender : '',
                  preparedParams.includeMetadata ? subject?.insert_user : '',
                ],
        (subject) =>
          !preparedParams.subjectId ||
          normalizeText(getSubjectId(subject)) === normalizeText(preparedParams.subjectId)
      );
      return { type, results: filtered };
    }
    case 'experiments': {
      const data = await client.getExperiments(preparedParams.projectId, preparedParams.subjectId);
              const filtered = filterByTerm(
                data,
                preparedParams,
                (experiment) => [
                  preparedParams.includeId ? getExperimentId(experiment) : '',
                  preparedParams.includeLabel ? getExperimentLabel(experiment) : '',
                  preparedParams.includeDescription ? experiment?.note : '',
                  preparedParams.includeMetadata ? experiment?.scanner : '',
                  preparedParams.includeMetadata ? getExperimentModality(experiment) : '',
                ],
                (experiment) => {
                  if (preparedParams.dateFrom || preparedParams.dateTo) {
                    const experimentDate = experiment?.date ? new Date(experiment.date) : null;
                    if (!experimentDate) return false;

                    if (preparedParams.dateFrom) {
                      const from = new Date(preparedParams.dateFrom);
                      if (experimentDate < from) return false;
                    }
                    if (preparedParams.dateTo) {
                      const to = new Date(preparedParams.dateTo);
                      if (experimentDate > to) return false;
                    }
                  }
                  return true;
                }
              );
              return { type, results: filtered };
            }
            default:
              return { type, results: [] };
          }
        })
      );

      return results;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!searchQuery.data || !preparedParams) return;

    const newEntry: RecentSearch = {
      term: preparedParams.term,
      type: preparedParams.type,
      includeId: preparedParams.includeId,
      includeLabel: preparedParams.includeLabel,
      includeDescription: preparedParams.includeDescription,
    includeMetadata: preparedParams.includeMetadata,
    dateFrom: preparedParams.dateFrom,
    dateTo: preparedParams.dateTo,
    projectId: preparedParams.projectId,
    subjectId: preparedParams.subjectId,
    timestamp: Date.now(),
  };

    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => !(item.term === newEntry.term && item.type === newEntry.type && item.projectId === newEntry.projectId)
      );
      const updated = [newEntry, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [preparedParams, searchQuery.data]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setFormError('Enter at least one search term to continue.');
      return;
    }
    if (!includeId && !includeLabel && !includeDescription && !includeMetadata) {
      setFormError('Select at least one field to search through.');
      return;
    }

    setFormError(null);
    setSearchParams({
      term: trimmed,
      type: searchType,
      includeId,
      includeLabel,
      includeDescription,
      includeMetadata,
      projectId: projectFilter || undefined,
      subjectId: subjectFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const handleRecentSearch = (recent: RecentSearch) => {
    setQuery(recent.term);
    setSearchType(recent.type);
    setIncludeId(recent.includeId);
    setIncludeLabel(recent.includeLabel);
    setIncludeDescription(recent.includeDescription);
    setIncludeMetadata(recent.includeMetadata);
    setProjectFilter(recent.projectId || '');
    setSubjectFilter(recent.subjectId || '');
    setDateFrom(recent.dateFrom || '');
    setDateTo(recent.dateTo || '');
    setSearchParams({
      term: recent.term,
      type: recent.type,
      includeId: recent.includeId,
      includeLabel: recent.includeLabel,
      includeDescription: recent.includeDescription,
      includeMetadata: recent.includeMetadata,
      projectId: recent.projectId,
      subjectId: recent.subjectId,
      dateFrom: recent.dateFrom,
      dateTo: recent.dateTo,
    });
  };

  const searchResults = searchQuery.data ?? [];
  const totalResults = searchResults.reduce((sum, group) => sum + group.results.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Search
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Search across projects, subjects, and experiments using XNAT-style filters and saved search history.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, name, description, modality…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as SearchType)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All data</option>
            <option value="projects">Projects</option>
            <option value="subjects">Subjects</option>
            <option value="experiments">Experiments</option>
          </select>

          <button
            type="submit"
            className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {searchQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeId}
                onChange={(event) => setIncludeId(event.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              ID
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeLabel}
                onChange={(event) => setIncludeLabel(event.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Name / Label
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeDescription}
                onChange={(event) => setIncludeDescription(event.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Description / Notes
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(event) => setIncludeMetadata(event.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Metadata fields
            </label>
          </div>

          <button
            type="button"
            onClick={() => setIsAdvancedOpen((prev) => !prev)}
            className="inline-flex items-center text-blue-600 hover:text-blue-500"
          >
            <Filter className="h-4 w-4 mr-1" />
            Advanced filters
            <ChevronDown
              className={clsx('ml-1 h-4 w-4 transition-transform', isAdvancedOpen ? 'rotate-180' : 'rotate-0')}
            />
          </button>
        </div>

        {isAdvancedOpen && (
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Project</label>
              <select
                value={projectFilter}
                onChange={(event) => {
                  setProjectFilter(event.target.value);
                  setSubjectFilter('');
                }}
                className="w-full rounded-md border border-gray-300 py-2 px-3 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All projects</option>
                {allProjects?.map((project) => (
                  <option key={getProjectId(project)} value={getProjectId(project)}>
                    {getProjectName(project)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                disabled={!projectFilter || !projectSubjects?.length}
                className="w-full rounded-md border border-gray-300 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">All subjects</option>
                {projectSubjects?.map((subject) => (
                  <option key={getSubjectId(subject)} value={getSubjectId(subject)}>
                    {subject?.label || getSubjectId(subject)}
                  </option>
                ))}
              </select>
              {!projectFilter && (
                <p className="text-xs text-gray-500">Select a project to narrow down subjects.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Experiment date range</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:border-blue-500 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}
      </form>

      {recentSearches.length > 0 && (
        <div className="bg-white p-5 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-blue-500" /> Recent searches
            </h2>
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={() => {
                setRecentSearches([]);
                localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
              }}
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((recent) => (
              <button
                key={`${recent.term}-${recent.timestamp}`}
                type="button"
                onClick={() => handleRecentSearch(recent)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600"
              >
                <span className="font-medium">{recent.term}</span>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-600">{getTypeLabel(recent.type)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {preparedParams ? (
          searchQuery.isLoading ? (
            <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-3" />
              Searching your XNAT data…
            </div>
          ) : totalResults === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
              <SearchIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-3 text-base font-semibold text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try broadening your filters or searching a different field.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((group) => (
                  <div key={group.type} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">{typeLabels[group.type]}</p>
                        <p className="text-2xl font-semibold text-gray-900">{group.results.length}</p>
                      </div>
                      <div className="rounded-full bg-blue-50 p-2">
                        {group.type === 'projects' && <Folder className="h-5 w-5 text-blue-500" />}
                        {group.type === 'subjects' && <Users className="h-5 w-5 text-blue-500" />}
                        {group.type === 'experiments' && <FileImage className="h-5 w-5 text-blue-500" />}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Showing matching {typeLabels[group.type].toLowerCase()} in your XNAT instance.
                    </p>
                  </div>
                ))}
              </div>

              {searchResults.map((group) => (
                <div key={`results-${group.type}`} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {typeLabels[group.type]} ({group.results.length})
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {group.results.map((item) => {
                      if (group.type === 'projects') {
                        const projectId = getProjectId(item);
                        return (
                          <div key={projectId} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                  {highlightMatch(getProjectName(item), preparedParams.term)}
                                </h3>
                                <p className="text-xs text-gray-500">{projectId}</p>
                                {item.description && (
                                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                                    {highlightMatch(item.description, preparedParams.term)}
                                  </p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                  {(item.pi_firstname || item.pi_lastname) && (
                                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-600">
                                      <User className="h-3 w-3" />
                                      PI: {item.pi_firstname} {item.pi_lastname}
                                    </span>
                                  )}
                                  {item.last_modified && (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Updated {new Date(item.last_modified).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Link
                                to={`/projects/${projectId}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                              >
                                View project →
                              </Link>
                            </div>
                          </div>
                        );
                      }

                      if (group.type === 'subjects') {
                        const subjectId = getSubjectId(item);
                        const projectId = getSubjectProjectId(item) || projectFilter;
                        return (
                          <div key={`${projectId}-${subjectId}`} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h3 className="text-base font-semibold text-gray-900">
                                  {highlightMatch(item.label || subjectId, preparedParams.term)}
                                </h3>
                                <p className="text-xs text-gray-500">Subject ID: {subjectId}</p>
                                <p className="text-xs text-gray-500">Project: {projectId || 'Unknown'}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                  {item.gender && (
                                    <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-600">
                                      Gender: {item.gender}
                                    </span>
                                  )}
                                  {item.insert_date && (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Created {new Date(item.insert_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {item.group && (
                                    <span className="rounded-full bg-green-50 px-2 py-1 text-green-600">
                                      Group: {highlightMatch(item.group, preparedParams.term)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {projectId && (
                                <Link
                                  to={`/subjects/${projectId}/${subjectId}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                >
                                  View subject →
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const experimentId = getExperimentId(item);
                        const projectId = getExperimentProjectId(item) || projectFilter;
                        const subjectId = getExperimentSubjectId(item) || subjectFilter;
                      return (
                        <div key={`${projectId}-${subjectId}-${experimentId}`} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="text-base font-semibold text-gray-900">
                                {highlightMatch(getExperimentLabel(item), preparedParams.term)}
                              </h3>
                              <p className="text-xs text-gray-500">Experiment ID: {experimentId}</p>
                              <p className="text-xs text-gray-500">
                                Project: {projectId || 'Unknown'} · Subject: {subjectId || 'Unknown'}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                {item.date && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(item.date).toLocaleDateString()}
                                  </span>
                                )}
                                {getExperimentModality(item) && (
                                  <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-600">
                                    {highlightMatch(getExperimentModality(item), preparedParams.term)}
                                  </span>
                                )}
                                {item.scanner && (
                                  <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-600">{item.scanner}</span>
                                )}
                              </div>
                              {item.note && (
                                <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                                  {highlightMatch(item.note, preparedParams.term)}
                                </p>
                              )}
                            </div>
                            {projectId && subjectId && (
                              <Link
                                to={`/experiments/${projectId}/${subjectId}/${experimentId}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                              >
                                View session →
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )
        ) : (
          <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
            <SearchIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-base font-semibold text-gray-900">Enter a search query</h3>
            <p className="mt-1 text-sm text-gray-500">
              Search for projects, subjects, or experiments by name, ID, modality, investigator, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}