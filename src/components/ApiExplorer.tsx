import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Search, RefreshCw, Info, Tag } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { OpenApiOperation, OpenApiSpec, OpenApiTag } from '../services/xnat-api';

interface EndpointEntry {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  deprecated: boolean;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700 border border-green-200',
  POST: 'bg-blue-100 text-blue-700 border border-blue-200',
  PUT: 'bg-amber-100 text-amber-700 border border-amber-200',
  PATCH: 'bg-purple-100 text-purple-700 border border-purple-200',
  DELETE: 'bg-red-100 text-red-700 border border-red-200',
  OPTIONS: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  HEAD: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const UNTITLED_TAG = 'Untagged';

function normalizeOperation(rawOperation: OpenApiOperation | unknown): OpenApiOperation | null {
  if (!rawOperation || typeof rawOperation !== 'object') return null;
  return rawOperation as OpenApiOperation;
}

function buildEndpoints(spec: OpenApiSpec | undefined): EndpointEntry[] {
  if (!spec?.paths) return [];

  const entries: EndpointEntry[] = [];

  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return;
    }

    Object.entries(pathItem).forEach(([methodKey, rawOperation]) => {
      const upperMethod = methodKey.toUpperCase();
      if (!HTTP_METHODS.includes(upperMethod)) {
        return;
      }

      const operation = normalizeOperation(rawOperation);
      if (!operation) return;

      const tags = operation.tags && operation.tags.length ? operation.tags : [UNTITLED_TAG];

      entries.push({
        id: `${upperMethod}-${path}`,
        method: upperMethod,
        path,
        summary: operation.summary ?? '',
        description: operation.description ?? '',
        tags,
        deprecated: Boolean(operation.deprecated),
      });
    });
  });

  return entries.sort((a, b) => {
    const methodIndexA = HTTP_METHODS.indexOf(a.method);
    const methodIndexB = HTTP_METHODS.indexOf(b.method);
    if (methodIndexA !== methodIndexB) {
      return methodIndexA - methodIndexB;
    }
    return a.path.localeCompare(b.path);
  });
}

function buildTagMap(tags: OpenApiTag[] | undefined): Map<string, OpenApiTag> {
  const map = new Map<string, OpenApiTag>();
  if (!tags) return map;
  tags.forEach((tag) => {
    if (tag?.name) {
      map.set(tag.name, tag);
    }
  });
  return map;
}

export function ApiExplorer() {
  const { client, config } = useXnat();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['openApiSpec', config?.baseURL],
    enabled: !!client,
    queryFn: async () => {
      if (!client) throw new Error('XNAT client unavailable');
      return client.getOpenApiSpec();
    },
    staleTime: 1000 * 60 * 15,
  });

  const spec = data;
  const endpoints = useMemo(() => buildEndpoints(spec), [spec]);
  const tagMetadata = useMemo(() => buildTagMap(spec?.tags), [spec]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    endpoints.forEach((endpoint) => {
      endpoint.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return counts;
  }, [endpoints]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((endpoint) => {
      const matchesTag =
        selectedTag === 'All' || endpoint.tags.includes(selectedTag);

      const combinedText = `${endpoint.method} ${endpoint.path} ${endpoint.summary} ${endpoint.description}`
        .toLowerCase();
      const matchesSearch = !normalizedSearch || combinedText.includes(normalizedSearch);

      return matchesTag && matchesSearch;
    });
  }, [endpoints, normalizedSearch, selectedTag]);

  const distinctTags = useMemo(() => {
    const tags = Array.from(tagCounts.keys()).sort((a, b) => a.localeCompare(b));
    return [
      { name: 'All', count: endpoints.length },
      ...tags.map((tag) => ({ name: tag, count: tagCounts.get(tag) ?? 0 })),
    ];
  }, [endpoints.length, tagCounts]);

  const specTitle = spec?.info?.title ?? 'XNAT REST API';
  const specVersion = spec?.info?.version ?? 'unknown';
  const specDescription = spec?.info?.description;
  const basePath = spec?.basePath ?? config?.baseURL ?? '';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Explorer</h1>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
            Browse the REST endpoints exposed by {specTitle}
            {specVersion ? ` (version ${specVersion})` : ''}. Use the filters to
            quickly locate endpoints by tag, method, or keyword. Data is sourced
            from the live XNAT specification when available with a local
            fallback.
          </p>
          {specDescription && (
            <p className="mt-2 text-xs text-gray-500 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>{specDescription}</span>
            </p>
          )}
          {basePath && (
            <p className="mt-1 text-xs text-gray-500">
              Base Path: <span className="font-medium text-gray-700">{basePath}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            type="button"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
            disabled={isFetching}
          >
            <RefreshCw
              className={clsx('h-4 w-4 mr-2', { 'animate-spin': isFetching })}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load the API specification
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="mb-1">
                  {error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred while fetching the OpenAPI document.'}
                </p>
                <p>
                  Ensure that the XNAT server exposes its OpenAPI description or
                  that the local fallback file `public/xnat-api-docs.json` is
                  present.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 p-4 sm:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {distinctTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => setSelectedTag(tag.name)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                  selectedTag === tag.name
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                )}
              >
                <Tag className="h-3 w-3" />
                <span>{tag.name}</span>
                <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-white/80 px-1 text-[11px] font-semibold text-gray-700">
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search endpoint path or summary"
              className="block w-full rounded-md border-0 py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="mt-3 h-5 w-1/2 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-full rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filteredEndpoints.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-sm font-semibold text-gray-900">
                No endpoints match your filters
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Try clearing the search term or selecting a different tag.
              </p>
            </div>
          ) : (
            filteredEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                          METHOD_COLORS[endpoint.method] ?? 'bg-gray-100 text-gray-700 border border-gray-200'
                        )}
                      >
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {endpoint.path}
                      </code>
                      {endpoint.deprecated && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          Deprecated
                        </span>
                      )}
                    </div>
                    {endpoint.summary && (
                      <p className="mt-3 text-sm font-semibold text-gray-900">
                        {endpoint.summary}
                      </p>
                    )}
                    {endpoint.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {endpoint.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {endpoint.tags.map((tag) => (
                      <span
                        key={`${endpoint.id}-${tag}`}
                        className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {endpoint.tags.some((tag) => tagMetadata.has(tag)) && (
                  <div className="mt-3 space-y-2">
                    {endpoint.tags.map((tag) => {
                      const meta = tagMetadata.get(tag);
                      if (!meta?.description) return null;
                      return (
                        <p
                          key={`${endpoint.id}-${tag}-meta`}
                          className="text-xs text-gray-500"
                        >
                          <span className="font-semibold text-gray-700">{tag}:</span>{' '}
                          {meta.description}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiExplorer;
