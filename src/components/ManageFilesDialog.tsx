import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  AlertCircle,
  Brain,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  File as FileIcon,
  FileText,
  Folder as FolderIcon,
  HardDrive,
  Layers,
  Loader2,
  Trash2,
  RefreshCcw,
  X,
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type {
  XnatAssessor,
  XnatResource,
  XnatResourceScope,
  XnatScan,
} from '../services/xnat-api';

interface ManageFilesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  subjectId: string;
  experimentId: string;
  experimentLabel?: string;
}

interface NormalizedResource {
  id: string;
  resourceKey: string;
  abstractId: string;
  scope: XnatResourceScope;
  scopeKey: string;
  apiLabel: string;
  label: string;
  format?: string;
  description?: string;
  fileCount: number;
  fileSize: number;
  content?: string;
  category?: string;
  tags?: string;
  raw: XnatResource;
}

interface NormalizedFile {
  key: string;
  name: string;
  size: number;
  format?: string;
  collection?: string;
  uri: string;
  digest?: string;
  tags?: string;
  relativePath: string;
}

type FileTreeNode = FileTreeFolderNode | FileTreeLeafNode;

interface FileTreeFolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: FileTreeNode[];
  fileCount: number;
  totalSize: number;
  fullPath: string;
}

interface FileTreeLeafNode {
  type: 'file';
  name: string;
  path: string;
  file: NormalizedFile;
  fullPath: string;
}

interface ResourceFilesState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  tree: FileTreeNode[];
  error?: string;
}

type TreeNode = GroupTreeNode | ResourceTreeNode;

interface GroupTreeNode {
  kind: 'group';
  id: string;
  label: string;
  summary?: string;
  icon: 'resources' | 'scans' | 'assessors' | 'scan' | 'assessor';
  children: TreeNode[];
}

interface ResourceTreeNode {
  kind: 'resource';
  id: string;
  resource: NormalizedResource;
}

const DEFAULT_EXPERIMENT_LABEL = 'Session Resources';

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, exponent);
  const decimals = value >= 10 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

function makeScopeKey(scope: XnatResourceScope): string {
  switch (scope.type) {
    case 'experiment':
      return 'experiment';
    case 'scan':
      return `scan:${scope.id}`;
    case 'assessor':
      return `assessor:${scope.id}`;
    case 'reconstruction':
      return `reconstruction:${scope.id}`;
    default:
      return 'unknown';
  }
}

function normalizeResources(
  resources: XnatResource[] | undefined,
  scope: XnatResourceScope
): NormalizedResource[] {
  if (!resources || resources.length === 0) {
    return [];
  }

  const scopeKey = makeScopeKey(scope);

  return resources.map((resource, index) => {
    const resourceRecord = resource as unknown as Record<string, unknown>;
    const label =
      parseString(resource.label) ||
      parseString(resourceRecord['Label']) ||
      `Resource ${index + 1}`;
    const abstractId =
      parseString(resource.xnat_abstractresource_id) ||
      parseString(resourceRecord['xnat_abstractresource_id']) ||
      parseString(resourceRecord['xnat_abstractResource_id']) ||
      `${scopeKey}-idx-${index}`;
    const resourceKey = `resource:${scopeKey}:${abstractId}`;
    const fileCount =
      parseNumber(resource.file_count) ||
      parseNumber(resourceRecord['File Count']) ||
      parseNumber(resourceRecord['files']) ||
      0;
    const fileSize =
      parseNumber(resource.file_size) ||
      parseNumber(resourceRecord['File Size']) ||
      0;

    return {
      id: resourceKey,
      resourceKey,
      abstractId,
      scope,
      scopeKey,
      apiLabel: label,
      label,
      format:
        parseString(resource.format) ||
        parseString(resourceRecord['file_format']),
      description:
        parseString(resource.description) ||
        parseString(resource.cat_desc) ||
        parseString(resourceRecord['cat_desc']) ||
        undefined,
      fileCount,
      fileSize,
      content: parseString(resource.content),
      category: parseString(resource.category ?? resourceRecord['category']),
      tags: parseString(resource.tags ?? resourceRecord['tags']),
      raw: resource,
    };
  });
}

function getRelativePath(file: Pick<NormalizedFile, 'uri' | 'name'>): string {
  if (!file.uri) return file.name;
  const [, rawPath] = file.uri.split('/files/');
  if (!rawPath) return file.name;
  const trimmed = rawPath.replace(/^\/+/, '');
  return decodeURIComponent(trimmed || file.name);
}

function normalizeFiles(records: Array<Record<string, unknown>> | undefined): NormalizedFile[] {
  if (!records || records.length === 0) {
    return [];
  }

  return records.map((record) => {
    const name = parseString(record.Name ?? record.name, 'Unnamed File');
    const uri = parseString(record.URI);
    const normalized: NormalizedFile = {
      key: uri || name,
      name,
      size: parseNumber(record.Size ?? record.size),
      format: parseString(record.file_format ?? record.format),
      collection: parseString(record.collection ?? record.Collection),
      uri,
      digest: parseString(record.digest ?? record.Digest),
      tags: parseString(record.file_tags ?? record.tags),
      relativePath: '',
    };
    normalized.relativePath = getRelativePath(normalized);
    return normalized;
  });
}

function buildFileTree(files: NormalizedFile[]): FileTreeNode[] {
  const root: FileTreeFolderNode = {
    type: 'folder',
    name: '',
    path: '',
    children: [],
    fileCount: 0,
    totalSize: 0,
    fullPath: '',
  };

  const folderMap = new Map<string, FileTreeFolderNode>();
  folderMap.set('', root);

  for (const file of files) {
    const segments = file.relativePath.split('/').filter(Boolean);
    if (!segments.length) {
      segments.push(file.name);
    }

    let parentPath = '';
    let parentFolder = root;

    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;

      if (isFile) {
        const filePath = parentPath ? `${parentPath}/${segment}` : segment;
        parentFolder.children.push({
          type: 'file',
          name: segment,
          path: filePath,
          file,
          fullPath: filePath,
        });

        let updatePath: string | null = parentPath;
        while (updatePath !== null) {
          const folderNode = folderMap.get(updatePath);
          if (folderNode) {
            folderNode.fileCount += 1;
            folderNode.totalSize += file.size;
          }
          if (updatePath === '') break;
          const separatorIndex = updatePath.lastIndexOf('/');
          updatePath = separatorIndex >= 0 ? updatePath.slice(0, separatorIndex) : '';
        }
        return;
      }

      const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
      let folderNode = folderMap.get(folderPath);

      if (!folderNode) {
        folderNode = {
          type: 'folder',
          name: segment,
          path: folderPath,
          children: [],
          fileCount: 0,
          totalSize: 0,
          fullPath: folderPath,
        };
        folderMap.set(folderPath, folderNode);
        parentFolder.children.push(folderNode);
      }

      parentPath = folderPath;
      parentFolder = folderNode;
    });
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.type === 'folder' ? -1 : 1;
    });
    nodes.forEach((node) => {
      if (node.type === 'folder') {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(root.children);

  return root.children;
}

function aggregateSummary(resources: NormalizedResource[]): string {
  if (!resources.length) return '0 files';
  const totalFiles = resources.reduce((acc, resource) => acc + resource.fileCount, 0);
  const totalSize = resources.reduce((acc, resource) => acc + resource.fileSize, 0);
  return `${totalFiles} ${totalFiles === 1 ? 'file' : 'files'} · ${formatBytes(totalSize)}`;
}

function getGroupIcon(icon: GroupTreeNode['icon']) {
  switch (icon) {
    case 'resources':
      return <HardDrive className="h-4 w-4 text-blue-600" />;
    case 'scans':
      return <Layers className="h-4 w-4 text-indigo-600" />;
    case 'assessors':
      return <Brain className="h-4 w-4 text-purple-600" />;
    case 'scan':
      return <Layers className="h-4 w-4 text-gray-500" />;
    case 'assessor':
      return <Brain className="h-4 w-4 text-gray-500" />;
    default:
      return <FolderIcon className="h-4 w-4 text-gray-500" />;
  }
}

export function ManageFilesDialog({
  isOpen,
  onClose,
  projectId,
  subjectId,
  experimentId,
  experimentLabel,
}: ManageFilesDialogProps) {
  const { client } = useXnat();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [resourceFiles, setResourceFiles] = useState<Record<string, ResourceFilesState>>({});
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [archiveFormat, setArchiveFormat] = useState<'zip' | 'tar.gz'>('zip');
  const archiveLabel = archiveFormat === 'zip' ? 'ZIP' : 'TAR.GZ';

  useEffect(() => {
    if (isOpen) {
      setExpandedNodes({
        'category:resources': true,
        'category:scans': true,
        'category:assessors': true,
      });
      setResourceFiles({});
      setSelectedNodes(new Set());
    } else {
      setExpandedNodes({});
      setResourceFiles({});
      setSelectedNodes(new Set());
    }
  }, [isOpen]);

  const sessionResourcesQuery = useQuery({
    queryKey: ['manage-files', 'resources', 'session', projectId, subjectId, experimentId],
    queryFn: () =>
      client?.getResources(projectId, subjectId, experimentId, { type: 'experiment' }) ?? [],
    enabled: isOpen && !!client,
    staleTime: 30_000,
  });

  const scansQuery = useQuery({
    queryKey: ['manage-files', 'scans', projectId, subjectId, experimentId],
    queryFn: () => client?.getScans(projectId, subjectId, experimentId) ?? [],
    enabled: isOpen && !!client && !!experimentId,
    staleTime: 30_000,
  });

  const assessorsQuery = useQuery({
    queryKey: ['manage-files', 'assessors', projectId, subjectId, experimentId],
    queryFn: () => client?.getAssessors(projectId, subjectId, experimentId) ?? [],
    enabled: isOpen && !!client && !!experimentId,
    staleTime: 30_000,
  });

  const scanResourceQueries = useQueries({
    queries: (scansQuery.data ?? []).map((scan) => ({
      queryKey: ['manage-files', 'scan-resources', projectId, subjectId, experimentId, scan.id],
      queryFn: () =>
        client?.getResources(projectId, subjectId, experimentId, {
          type: 'scan',
          id: scan.id,
        }) ?? [],
      enabled: isOpen && !!client,
      staleTime: 30_000,
    })),
  });

  const assessorResourceQueries = useQueries({
    queries: (assessorsQuery.data ?? []).map((assessor) => ({
      queryKey: [
        'manage-files',
        'assessor-resources',
        projectId,
        subjectId,
        experimentId,
        assessor.id,
      ],
      queryFn: () =>
        client?.getResources(projectId, subjectId, experimentId, {
          type: 'assessor',
          id: assessor.id,
        }) ?? [],
      enabled: isOpen && !!client,
      staleTime: 30_000,
    })),
  });

  const sessionResources = useMemo(
    () => normalizeResources(sessionResourcesQuery.data, { type: 'experiment' }),
    [sessionResourcesQuery.data]
  );

  const scanResourceGroups = useMemo(() => {
    if (!scansQuery.data || scansQuery.data.length === 0) {
      return [];
    }
    return scansQuery.data.map((scan: XnatScan, index) => {
      const resources = normalizeResources(scanResourceQueries[index]?.data, {
        type: 'scan',
        id: scan.id,
      });
      return {
        scan,
        resources,
      };
    });
  }, [scansQuery.data, scanResourceQueries]);

const assessorResourceGroups = useMemo(() => {
  if (!assessorsQuery.data || assessorsQuery.data.length === 0) {
    return [];
  }
  return assessorsQuery.data.map((assessor: XnatAssessor, index) => {
    const resources = normalizeResources(assessorResourceQueries[index]?.data, {
      type: 'assessor',
      id: assessor.id,
    });
    return {
      assessor,
      resources,
    };
  });
}, [assessorsQuery.data, assessorResourceQueries]);

  const allResources = useMemo(() => {
    const list: NormalizedResource[] = [];
    list.push(...sessionResources);
    scanResourceGroups.forEach((group) => list.push(...group.resources));
    assessorResourceGroups.forEach((group) => list.push(...group.resources));
    return list;
  }, [sessionResources, scanResourceGroups, assessorResourceGroups]);

  const resourceMap = useMemo(() => {
    const map = new Map<string, NormalizedResource>();
    allResources.forEach((resource) => {
      map.set(resource.resourceKey, resource);
    });
    return map;
  }, [allResources]);

  const selectedResourceKeys = useMemo(
    () => Array.from(selectedNodes).filter((id) => id.startsWith('resource:')),
    [selectedNodes]
  );

  const hasSelectedResources = selectedResourceKeys.length > 0;

  const handleDownloadSelected = useCallback(() => {
    if (!client) {
      window.alert('Unable to download files: XNAT client is unavailable.');
      return;
    }
    if (!experimentId) {
      window.alert('Bulk download is only available for experiments. Please download individual resources.');
      return;
    }

    const ids = Array.from(
      new Set(
        selectedResourceKeys
          .map((key) => resourceMap.get(key)?.abstractId)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (!ids.length) {
      window.alert('Select at least one resource to download.');
      return;
    }

    let url: string;
    try {
      url = client.getBulkResourceDownloadUrl(experimentId, ids, {
        structure: 'improved',
        all: true,
        format: archiveFormat,
      });
    } catch (error) {
      console.error('Failed to prepare download URL', error);
      window.alert('Unable to prepare download URL. Please try again.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  }, [client, experimentId, archiveFormat, selectedResourceKeys, resourceMap]);

  const treeRoots: TreeNode[] = useMemo(() => {
    const nodes: TreeNode[] = [];

    if (sessionResources.length) {
      nodes.push({
        kind: 'group',
        id: 'category:resources',
        label: 'Resources',
        summary: aggregateSummary(sessionResources),
        icon: 'resources',
        children: sessionResources.map((resource) => ({
          kind: 'resource',
          id: resource.resourceKey,
          resource,
        })),
      });
    }

    const scanChildren = scanResourceGroups
      .filter((group) => group.resources.length > 0)
      .map((group) => ({
        kind: 'group' as const,
        id: `scan:${group.scan.id}`,
        label:
          parseString(group.scan.series_description) ||
          parseString(group.scan.type) ||
          `Scan ${group.scan.id}`,
        summary: aggregateSummary(group.resources),
        icon: 'scan' as const,
        children: group.resources.map((resource) => ({
          kind: 'resource' as const,
          id: resource.resourceKey,
          resource,
        })),
      }));

    if (scanChildren.length) {
      nodes.push({
        kind: 'group',
        id: 'category:scans',
        label: 'Scans',
        summary: `${scanChildren.length} ${scanChildren.length === 1 ? 'scan' : 'scans'}`,
        icon: 'scans',
        children: scanChildren,
      });
    }

    const assessorChildren = assessorResourceGroups
      .filter((group) => group.resources.length > 0)
      .map((group) => ({
        kind: 'group' as const,
        id: `assessor:${group.assessor.id}`,
        label: group.assessor.label || group.assessor.id,
        summary: aggregateSummary(group.resources),
        icon: 'assessor' as const,
        children: group.resources.map((resource) => ({
          kind: 'resource' as const,
          id: resource.resourceKey,
          resource,
        })),
      }));

    if (assessorChildren.length) {
      nodes.push({
        kind: 'group',
        id: 'category:assessors',
        label: 'Assessors',
        summary: `${assessorChildren.length} ${
          assessorChildren.length === 1 ? 'assessor' : 'assessors'
        }`,
        icon: 'assessors',
        children: assessorChildren,
      });
    }

    return nodes;
  }, [sessionResources, scanResourceGroups, assessorResourceGroups]);

  const baseUrl = client ? client.getBaseUrl() : '';
  const scanResourcesLoading = scanResourceQueries.some((query) => query.isLoading);
  const assessorResourcesLoading = assessorResourceQueries.some((query) => query.isLoading);
  const isInitialLoading =
    sessionResourcesQuery.isLoading || scansQuery.isLoading || assessorsQuery.isLoading;
  const isAnyLoading = isInitialLoading || scanResourcesLoading || assessorResourcesLoading;
  const hasError =
    sessionResourcesQuery.isError ||
    scansQuery.isError ||
    assessorsQuery.isError ||
    scanResourceQueries.some((query) => query.isError) ||
    assessorResourceQueries.some((query) => query.isError);
  const firstError =
    (sessionResourcesQuery.error as Error | undefined) ||
    (scansQuery.error as Error | undefined) ||
    (assessorsQuery.error as Error | undefined) ||
    (scanResourceQueries.find((query) => query.error)?.error as Error | undefined) ||
    (assessorResourceQueries.find((query) => query.error)?.error as Error | undefined);

  const buildArchiveUrl = (resource: NormalizedResource, path?: string) => {
    if (!client) return undefined;
    return client.getResourceDownloadUrl(
      projectId,
      subjectId,
      experimentId,
      resource.apiLabel,
      resource.scope,
      {
        format: archiveFormat,
        ...(path ? { path } : {}),
      }
    );
  };

  const isSelected = useCallback((id: string) => selectedNodes.has(id), [selectedNodes]);

  const toggleSelection = useCallback((ids: string | string[], selected?: boolean) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    setSelectedNodes((previous) => {
      const next = new Set(previous);
      idList.forEach((id) => {
        if (!id) return;
        const shouldSelect = selected ?? !next.has(id);
        if (shouldSelect) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  }, []);

  const toggleNode = (
    nodeId: string,
    payload?: { type: 'resource'; resource: NormalizedResource }
  ) => {
    setExpandedNodes((previous) => {
      const current = Boolean(previous[nodeId]);
      const next = !current;
      if (next && payload?.type === 'resource') {
        void ensureResourceFiles(payload.resource);
      }
      return {
        ...previous,
        [nodeId]: next,
      };
    });
  };

  const ensureResourceFiles = async (
    resource: NormalizedResource,
    options: { force?: boolean } = {}
  ) => {
    if (!client) return;
    const key = resource.resourceKey;
    let shouldFetch = true;

    setResourceFiles((previous) => {
      const existing = previous[key];
      if (
        existing &&
        !options.force &&
        (existing.status === 'loading' || existing.status === 'loaded')
      ) {
        shouldFetch = false;
        return previous;
      }
      return {
        ...previous,
        [key]: {
          status: 'loading',
          tree: [],
        },
      };
    });

    if (!shouldFetch) return;

    try {
      const files = await client.getFiles(
        projectId,
        subjectId,
        experimentId,
        resource.apiLabel,
        resource.scope
      );
      const normalized = normalizeFiles(
        files as unknown as Array<Record<string, unknown>>
      );
      const tree = buildFileTree(normalized);
      setResourceFiles((previous) => ({
        ...previous,
        [key]: {
          status: 'loaded',
          tree,
        },
      }));
    } catch (error: any) {
      setResourceFiles((previous) => ({
        ...previous,
        [key]: {
          status: 'error',
          tree: [],
          error: error?.message ?? 'Failed to load files',
        },
      }));
    }
  };

  const refreshAll = useCallback(() => {
    sessionResourcesQuery.refetch();
    scansQuery.refetch();
    assessorsQuery.refetch();
    scanResourceQueries.forEach((query) => query.refetch?.());
    assessorResourceQueries.forEach((query) => query.refetch?.());
    setResourceFiles({});
    setSelectedNodes(new Set());
  }, [
    sessionResourcesQuery,
    scansQuery,
    assessorsQuery,
    scanResourceQueries,
    assessorResourceQueries,
  ]);

  const handleDeleteResource = useCallback(
    async (resource: NormalizedResource) => {
      if (!client) return;
      const confirmed = window.confirm(
        `Delete resource "${resource.label}"? This action cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await client.deleteResource(
          projectId,
          subjectId,
          experimentId,
          resource.apiLabel,
          resource.scope
        );
        refreshAll();
      } catch (error) {
        console.error('Failed to delete resource', error);
        alert('Failed to delete resource. Please try again.');
      }
    },
    [client, experimentId, projectId, refreshAll, subjectId]
  );

  const handleDeleteFile = useCallback(
    async (resource: NormalizedResource, node: FileTreeLeafNode) => {
      if (!client) return;
      const confirmed = window.confirm(
        `Delete file "${node.file.name}"? This action cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await client.deleteFile(
          projectId,
          subjectId,
          experimentId,
          resource.apiLabel,
          node.file.name,
          resource.scope,
          { path: node.path }
        );
        await ensureResourceFiles(resource, { force: true });
      } catch (error) {
        console.error('Failed to delete file', error);
        alert('Failed to delete file. Please try again.');
      }
    },
    [client, ensureResourceFiles, experimentId, projectId, subjectId]
  );

  const renderFileTree = (resource: NormalizedResource, nodes: FileTreeNode[], depth: number) => {
    if (!nodes.length) {
      return (
        <div
          key={`${resource.resourceKey}-empty`}
          className="px-4 py-2 text-sm text-gray-500"
          style={{ paddingLeft: depth * 16 }}
        >
          No files in this resource.
        </div>
      );
    }

    return nodes.map((node) => {
      const indentStyle = { paddingLeft: depth * 16 };
      if (node.type === 'folder') {
        const nodeId = `${resource.resourceKey}::folder:${node.path || 'root'}`;
        const isExpanded = expandedNodes[nodeId] ?? (depth < 2);
        const archiveUrl = buildArchiveUrl(resource, node.path || undefined);

        const collectSelectionIds = (treeNode: FileTreeNode): string[] => {
          if (treeNode.type === 'file') {
            return [`${resource.resourceKey}::file:${treeNode.fullPath}`];
          }
          if (!treeNode.children.length) {
            return [`${resource.resourceKey}::folder:${treeNode.path || 'root'}`];
          }
          return treeNode.children.flatMap(collectSelectionIds);
        };

        const descendantSelectionIds = collectSelectionIds(node);
        const totalSelectable = descendantSelectionIds.length;
        const selectedDescendants = descendantSelectionIds.filter((id) => isSelected(id)).length;
        const selected = isSelected(nodeId);
        const isIndeterminate = !selected && selectedDescendants > 0 && selectedDescendants < totalSelectable;

        return (
          <div key={nodeId}>
            <div
              className={`flex items-start justify-between rounded-lg px-3 py-2 text-sm transition border ${
                selected ? 'border-blue-100 bg-blue-50' : 'border-transparent hover:bg-gray-50'
              }`}
              style={indentStyle}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggleNode(nodeId)}
                  className="mt-0.5 text-gray-400 transition hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="checkbox"
                  checked={selected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isIndeterminate;
                    }
                  }}
                  onChange={(event) => {
                    event.stopPropagation();
                    const idsToToggle = [
                      nodeId,
                      ...descendantSelectionIds,
                    ];
                    toggleSelection(idsToToggle, event.currentTarget.checked);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={selected ? 'Deselect folder' : 'Select folder'}
                />
                <FolderIcon className="mt-0.5 h-4 w-4 text-amber-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 break-all">{node.name || 'Root'}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {node.fileCount} {node.fileCount === 1 ? 'file' : 'files'} · {formatBytes(node.totalSize)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {archiveUrl && (
                  <a
                    href={archiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                    <span className="ml-1 text-[10px] font-semibold uppercase text-gray-400">
                      {archiveLabel}
                    </span>
                  </a>
                )}
              </div>
            </div>
            {isExpanded && renderFileTree(resource, node.children, depth + 1)}
          </div>
        );
      }

      const nodeId = `${resource.resourceKey}::file:${node.path}`;
      const downloadUrl = baseUrl ? `${baseUrl}${node.file.uri}` : node.file.uri;
      const details: string[] = [];
      if (node.file.format) {
        details.push(node.file.format);
      }
      details.push(formatBytes(node.file.size));
      if (node.file.collection) {
        details.push(node.file.collection);
      }
      const selected = isSelected(nodeId);

      return (
        <div
          key={nodeId}
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm border transition ${
            selected ? 'border-blue-100 bg-blue-50' : 'border-transparent hover:bg-gray-50'
          }`}
          style={indentStyle}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4" aria-hidden />
            <span className="mt-0.5 h-4 w-4" aria-hidden />
            <FileIcon className="mt-0.5 h-4 w-4 text-gray-400" />
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 break-all">{node.file.name}</span>
              <span className="text-xs text-gray-500">{details.join(' • ')}</span>
            </div>
          </div>
          {downloadUrl ? (
            <div className="flex items-center gap-2">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-gray-200 hover:text-gray-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDeleteFile(resource, node);
                }}
                className="rounded-full border border-transparent p-1 text-red-500 transition hover:bg-red-50"
                aria-label="Delete file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400">No download URL</span>
          )}
        </div>
      );
    });
  };

  const renderTreeNode = (node: TreeNode, depth = 0): ReactElement => {
    const indentStyle = { paddingLeft: depth * 16 };
    const defaultExpanded = depth === 0 && node.kind === 'group';
    const nodeId = node.kind === 'group' ? node.id : node.id;
    const isExpanded = expandedNodes[nodeId] ?? defaultExpanded;

    const collectResourceKeys = (treeNode: TreeNode): string[] => {
      if (treeNode.kind === 'resource') {
        return [treeNode.resource.resourceKey];
      }
      return treeNode.children.flatMap((child) => collectResourceKeys(child));
    };

    if (node.kind === 'group') {
      const isRootCategory = depth === 0;
      const descendantResourceKeys = collectResourceKeys(node);
      const totalResources = descendantResourceKeys.length;
      const selectedResources = descendantResourceKeys.filter((key) => isSelected(key)).length;
      const groupSelected = totalResources > 0 && selectedResources === totalResources;
      const groupIndeterminate = selectedResources > 0 && selectedResources < totalResources;

      return (
        <div key={node.id} className="space-y-1">
          <div
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-gray-50 ${
              isRootCategory ? 'bg-gray-50 text-gray-900' : 'text-gray-800'
            }`}
            style={indentStyle}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleNode(node.id)}
                className="text-gray-400 transition hover:text-gray-600"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {totalResources > 0 && (
                <input
                  type="checkbox"
                  checked={groupSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = groupIndeterminate;
                    }
                  }}
                  onChange={(event) => {
                    event.stopPropagation();
                    toggleSelection(descendantResourceKeys, event.currentTarget.checked);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={
                    groupSelected ? `Deselect ${node.label}` : `Select ${node.label}`
                  }
                />
              )}
              {getGroupIcon(node.icon)}
              <span>{node.label}</span>
            </div>
            <div className="flex items-center gap-3">
              {node.summary && <span className="text-xs text-gray-500">{node.summary}</span>}
            </div>
          </div>
          {isExpanded && node.children.length > 0 ? (
            node.children.map((child) => renderTreeNode(child, depth + 1))
          ) : (
            isExpanded && (
              <div
                className="px-4 py-2 text-sm text-gray-500"
                style={{ paddingLeft: (depth + 1) * 16 }}
              >
                No resources in this section.
              </div>
            )
          )}
        </div>
      );
    }

    const resource = node.resource;
    const resourceState = resourceFiles[resource.resourceKey];
    const resourceArchiveUrl = buildArchiveUrl(resource);
    const resourceSelected = isSelected(resource.resourceKey);
    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-start justify-between rounded-lg px-3 py-2 text-sm transition border ${
            resourceSelected
              ? 'border-blue-100 bg-blue-50'
              : 'border-transparent hover:bg-gray-50'
          }`}
          style={indentStyle}
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => toggleNode(resource.resourceKey, { type: 'resource', resource })}
              className="mt-0.5 text-gray-400 transition hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <input
              type="checkbox"
              checked={resourceSelected}
              onChange={(event) => {
                event.stopPropagation();
                toggleSelection(resource.resourceKey, event.currentTarget.checked);
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-label={resourceSelected ? 'Deselect resource' : 'Select resource'}
            />
            <FolderIcon className="mt-0.5 h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium text-gray-900 break-all">{resource.label}</div>
              <div className="mt-0.5 text-xs text-gray-500">
                {resource.fileCount} {resource.fileCount === 1 ? 'file' : 'files'} ·{' '}
                {formatBytes(resource.fileSize)}
                {resource.format && (
                  <span className="ml-2 uppercase text-gray-400">{resource.format}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {resourceArchiveUrl && (
              <a
                href={resourceArchiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                <Download className="h-3.5 w-3.5" />
                Download
                <span className="ml-1 text-[10px] font-semibold uppercase text-gray-400">
                  {archiveLabel}
                </span>
              </a>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleDeleteResource(resource);
              }}
              className="rounded-full border border-transparent p-1 text-red-500 transition hover:bg-red-50"
              aria-label="Delete resource"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="space-y-1">
            {resourceState?.status === 'loading' && (
              <div
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500"
                style={{ paddingLeft: (depth + 1) * 16 }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading files…
              </div>
            )}
            {resourceState?.status === 'error' && (
              <div
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600"
                style={{ paddingLeft: (depth + 1) * 16 }}
              >
                <AlertCircle className="h-4 w-4" />
                {resourceState.error || 'Failed to load files'}
              </div>
            )}
            {resourceState?.status === 'loaded' &&
              renderFileTree(resource, resourceState.tree, depth + 1)}
            {!resourceState && resource.fileCount === 0 && (
              <div
                className="px-4 py-2 text-sm text-gray-500"
                style={{ paddingLeft: (depth + 1) * 16 }}
              >
                No files in this resource.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  const headerLabel = experimentLabel || DEFAULT_EXPERIMENT_LABEL;

  // Build breadcrumb based on available IDs
  let breadcrumb = projectId;
  if (subjectId) {
    breadcrumb += ` / ${subjectId}`;
  }
  if (experimentId) {
    breadcrumb += ` / ${headerLabel}`;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="flex h-full w-full max-h-[90vh] max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Files</h2>
            <p className="text-sm text-gray-500">
              {breadcrumb}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {experimentId && (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  Archive as
                  <select
                    value={archiveFormat}
                    onChange={(event) =>
                      setArchiveFormat(event.target.value === 'tar.gz' ? 'tar.gz' : 'zip')
                    }
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="zip">ZIP</option>
                    <option value="tar.gz">TAR.GZ</option>
                  </select>
                </label>
                <button
                  onClick={handleDownloadSelected}
                  disabled={!hasSelectedResources}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                    hasSelectedResources
                      ? 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:text-blue-800'
                      : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  Download Selected
                </button>
              </>
            )}
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-transparent p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isAnyLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <p>Loading managed files…</p>
              </div>
            ) : hasError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-red-600">
                <AlertCircle className="h-6 w-6" />
                <p>Failed to load managed files for this session.</p>
                {firstError?.message && (
                  <p className="text-xs text-red-500">{firstError.message}</p>
                )}
              </div>
            ) : treeRoots.length ? (
              <div className="space-y-2">
                {treeRoots.map((node) => renderTreeNode(node))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-gray-500">
                <FileText className="mb-2 h-8 w-8 text-gray-400" />
                <p>No managed files were found for this session.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Try switching to a different project or uploading new resources.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
