import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Folder as FolderIcon,
  FolderOpen,
  File as FileIcon,
  RefreshCcw,
  Download,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { useXnat } from '../contexts/XnatContext';
import type { WorkflowBuildDirNode, XnatConfig } from '../services/xnat-api';
import type { XnatApiClient } from '../services/xnat-api';

interface TreeNode extends WorkflowBuildDirNode {
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  hasFetchedChildren?: boolean;
  hasMoreChildren?: boolean;
}

const toTreeNodes = (nodes: WorkflowBuildDirNode[] = []): TreeNode[] =>
  nodes.map((node) => ({
    ...node,
    children: Array.isArray(node.children) ? toTreeNodes(node.children as WorkflowBuildDirNode[]) : undefined,
    hasFetchedChildren: Array.isArray(node.children),
    hasMoreChildren: node.children === true,
    isExpanded: false,
    isLoading: false,
  }));

const isFolderNode = (node: TreeNode): boolean => {
  if (node.type) {
    return node.type.toLowerCase() === 'folder' || node.type.toLowerCase() === 'directory';
  }
  if (node.hasMoreChildren) return true;
  if (Array.isArray(node.children)) return node.children.length > 0;
  return Boolean(node.download_link) === false;
};

const getNodeKey = (node: TreeNode): string => node.path || node.id || node.text;

const buildDownloadHref = (href: string, baseUrl?: string): string => {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }
  if (href.startsWith('/')) {
    return `${baseUrl ?? ''}${href}`;
  }
  return `${baseUrl ?? ''}/${href}`;
};

const fetchBuildDirNodes = async (
  apiClient: XnatApiClient,
  config: XnatConfig | null,
  workflowId: string,
  path?: string,
): Promise<WorkflowBuildDirNode[]> => {
  const maybeFn = (apiClient as unknown as Record<string, unknown>).getWorkflowBuildDir;
  if (typeof maybeFn === 'function') {
    return (maybeFn as (workflowId: string, path?: string) => Promise<WorkflowBuildDirNode[]>)(workflowId, path);
  }

  const endpoint = path
    ? `/xapi/workflows/${workflowId}/build_dir_contd?inputPath=${encodeURIComponent(path)}`
    : `/xapi/workflows/${workflowId}/build_dir`;

  const baseUrl = config?.baseURL || '';
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data as WorkflowBuildDirNode[];
  }
  if (Array.isArray(data?.items)) {
    return data.items as WorkflowBuildDirNode[];
  }
  return [];
};

export function WorkflowBuildDir() {
  const { workflowId } = useParams();
  const { client, config } = useXnat();
  const queryClient = useQueryClient();

  const {
    data: rootNodes,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TreeNode[]>({
    queryKey: ['workflow-build-dir', workflowId],
    queryFn: async () => {
      if (!client || !workflowId) return [];
      const data = await fetchBuildDirNodes(client, config, workflowId);
      return toTreeNodes(data);
    },
    enabled: Boolean(client) && Boolean(workflowId),
  });

  const [tree, setTree] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (rootNodes) {
      setTree(rootNodes);
    }
  }, [rootNodes]);

  const handleToggle = async (node: TreeNode) => {
    if (!client || !workflowId) return;
    const nodeKey = getNodeKey(node);
    setTree((prev) =>
      prev.map((item) => updateNode(item, nodeKey, (current) => ({
        ...current,
        isExpanded: !current.isExpanded,
      }))),
    );

    if (node.hasFetchedChildren || !isFolderNode(node)) {
      return;
    }

    setTree((prev) =>
      prev.map((item) => updateNode(item, nodeKey, (current) => ({
        ...current,
        isLoading: true,
      }))),
    );

    try {
      const path = node.path || node.id || node.text;
      const data = await queryClient.fetchQuery({
        queryKey: ['workflow-build-dir', workflowId, path],
        queryFn: () => fetchBuildDirNodes(client, config, workflowId, path),
      });
      setTree((prev) =>
        prev.map((item) => updateNode(item, nodeKey, (current) => ({
          ...current,
          children: toTreeNodes(data),
          hasFetchedChildren: true,
          hasMoreChildren: false,
          isLoading: false,
          isExpanded: true,
        }))),
      );
    } catch (err) {
      console.error('Failed to load build directory children', err);
      setTree((prev) =>
        prev.map((item) => updateNode(item, nodeKey, (current) => ({
          ...current,
          isLoading: false,
        }))),
      );
    }
  };

  const baseUrl = config?.baseURL;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <Link
              to={workflowId ? `/processing/workflows/${workflowId}` : '/processing'}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Workflow
            </Link>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Workflow Build Directory</h1>
          {workflowId && <p className="text-sm text-gray-500">Workflow ID: {workflowId}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            queryClient.removeQueries({ queryKey: ['workflow-build-dir', workflowId] });
            refetch();
          }}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load build directory. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      ) : tree.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          No build directory entries were returned for this workflow.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <DirectoryTree
            nodes={tree}
            onToggle={handleToggle}
            baseUrl={baseUrl}
          />
        </div>
      )}
    </div>
  );
}

interface DirectoryTreeProps {
  nodes: TreeNode[];
  onToggle: (node: TreeNode) => void;
  baseUrl?: string;
}

function DirectoryTree({ nodes, onToggle, baseUrl }: DirectoryTreeProps) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <TreeNodeRow key={getNodeKey(node)} node={node} onToggle={onToggle} baseUrl={baseUrl} />
      ))}
    </ul>
  );
}

interface TreeNodeRowProps {
  node: TreeNode;
  onToggle: (node: TreeNode) => void;
  baseUrl?: string;
}

function TreeNodeRow({ node, onToggle, baseUrl }: TreeNodeRowProps) {
  const isFolder = isFolderNode(node);
  const nodeKey = getNodeKey(node);

  return (
    <li>
      <div
        className={clsx(
          'flex items-center rounded-md px-2 py-1 text-sm transition-colors',
          isFolder ? 'hover:bg-gray-50' : 'hover:bg-blue-50',
        )}
      >
        {isFolder ? (
          <button
            type="button"
            onClick={() => onToggle(node)}
            className="mr-2 inline-flex items-center rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
          >
            {node.isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : node.isExpanded ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <FolderIcon className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="mr-2 text-gray-400">
            <FileIcon className="h-4 w-4" />
          </span>
        )}
        <span className="flex-1 truncate" title={node.text}>
          {node.text || nodeKey}
        </span>
        {!isFolder && node.download_link && (
          <a
            className="ml-2 inline-flex items-center rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
            href={buildDownloadHref(node.download_link, baseUrl)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="mr-1 h-3 w-3" />
            Download
          </a>
        )}
      </div>
      {isFolder && node.isExpanded && Array.isArray(node.children) && node.children.length > 0 && (
        <div className="ml-6 mt-1">
          <DirectoryTree nodes={node.children} onToggle={onToggle} baseUrl={baseUrl} />
        </div>
      )}
      {isFolder && node.isExpanded && Array.isArray(node.children) && node.children.length === 0 && !node.isLoading && (
        <div className="ml-6 mt-1 rounded bg-gray-50 px-3 py-2 text-xs text-gray-500">Empty folder</div>
      )}
    </li>
  );
}

function updateNode(node: TreeNode, nodeKey: string, updater: (node: TreeNode) => TreeNode): TreeNode {
  const currentKey = getNodeKey(node);
  if (currentKey === nodeKey) {
    return updater(node);
  }

  if (Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) => updateNode(child, nodeKey, updater)),
    };
  }

  return node;
}

export default WorkflowBuildDir;
