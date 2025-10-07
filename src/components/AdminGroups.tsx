import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Trash2, Edit } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';

interface Group {
  id: string;
  tag: string;
  displayName?: string;
  description?: string;
}

export function AdminGroups() {
  const { client } = useXnat();
  const handleOpenCreateModal = () => {
    console.warn('Group creation is not yet implemented in this interface.');
  };

  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      if (!client) return [];
      // This would call a real API endpoint - for now returning placeholder
      return [] as Group[];
    },
    enabled: !!client,
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Manage Groups</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure user groups and access control
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-700">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Group
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              Failed to load groups. Please verify your permissions.
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No groups</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new group.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-slate-700"
                >
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {group.displayName || group.tag}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{group.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
