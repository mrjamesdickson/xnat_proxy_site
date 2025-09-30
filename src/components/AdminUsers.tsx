import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Shield,
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatUser } from '../services/xnat-api';

interface UserFormState {
  login: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirmPassword: string;
  enabled: boolean;
  verified: boolean;
  roles: string;
  groups: string;
}

interface UpdateUserMutationInput {
  identifier: string;
  data: {
    firstname?: string;
    lastname?: string;
    email?: string;
    password?: string;
    enabled?: boolean;
    verified?: boolean;
    roles?: string[];
    groups?: string[];
  };
}

interface StatusBadgeProps {
  label: string;
  active: boolean;
}

const initialFormState: UserFormState = {
  login: '',
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  confirmPassword: '',
  enabled: true,
  verified: false,
  roles: '',
  groups: '',
};

function StatusBadge({ label, active }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        active
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-600'
      )}
    >
      {active ? (
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
      ) : (
        <XCircle className="mr-1 h-3.5 w-3.5" />
      )}
      {label}
    </span>
  );
}

function getUserIdentifier(user: XnatUser): string {
  return user.login || String(user.xdat_user_id ?? user.id ?? '');
}

function formatList(value?: string[] | string): string {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value;
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatDate(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export function AdminUsers() {
  const { client } = useXnat();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | null>(null);
  const [formState, setFormState] = useState<UserFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<XnatUser | null>(null);

  const {
    data: users = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      if (!client) return [] as XnatUser[];
      return client.getUsers();
    },
    enabled: !!client,
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: {
      login: string;
      firstname: string;
      lastname: string;
      email: string;
      password: string;
      enabled: boolean;
      verified: boolean;
      roles: string[];
      groups: string[];
    }) => {
      if (!client) throw new Error('XNAT client not initialized');
      return client.createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ identifier, data }: UpdateUserMutationInput) => {
      if (!client) throw new Error('XNAT client not initialized');
      return client.updateUser(identifier, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (identifier: string) => {
      if (!client) throw new Error('XNAT client not initialized');
      return client.deleteUser(identifier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleOpenCreateModal = () => {
    setFormState(initialFormState);
    setFormError(null);
    setEditingUser(null);
    setActiveModal('create');
  };

  const handleOpenEditModal = (user: XnatUser) => {
    setFormState({
      login: user.login,
      firstname: user.firstname ?? '',
      lastname: user.lastname ?? '',
      email: user.email ?? '',
      password: '',
      confirmPassword: '',
      enabled: user.enabled ?? true,
      verified: user.verified ?? false,
      roles: formatList(user.authorization?.roles),
      groups: formatList(user.authorization?.groups),
    });
    setFormError(null);
    setEditingUser(user);
    setActiveModal('edit');
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingUser(null);
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.login.trim()) {
      setFormError('Username is required.');
      return;
    }

    if (!formState.firstname.trim() || !formState.lastname.trim()) {
      setFormError('First name and last name are required.');
      return;
    }

    if (!formState.email.trim()) {
      setFormError('Email address is required.');
      return;
    }

    const roles = parseList(formState.roles);
    const groups = parseList(formState.groups);

    if (activeModal === 'create') {
      if (!formState.password) {
        setFormError('Password is required.');
        return;
      }

      if (formState.password !== formState.confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }

      try {
        await createUserMutation.mutateAsync({
          login: formState.login.trim(),
          firstname: formState.firstname.trim(),
          lastname: formState.lastname.trim(),
          email: formState.email.trim(),
          password: formState.password,
          enabled: formState.enabled,
          verified: formState.verified,
          roles,
          groups,
        });
        closeModal();
      } catch (err: any) {
        const message = err?.userMessage || err?.message || 'Failed to create user.';
        setFormError(message);
      }
      return;
    }

    if (activeModal === 'edit' && editingUser) {
      const identifier = getUserIdentifier(editingUser);
      if (!identifier) {
        setFormError('Unable to determine user identifier.');
        return;
      }

      try {
        await updateUserMutation.mutateAsync({
          identifier,
          data: {
            firstname: formState.firstname.trim(),
            lastname: formState.lastname.trim(),
            email: formState.email.trim(),
            enabled: formState.enabled,
            verified: formState.verified,
            roles,
            groups,
          },
        });
        closeModal();
      } catch (err: any) {
        const message = err?.userMessage || err?.message || 'Failed to update user.';
        setFormError(message);
      }
    }
  };

  const handleDeleteUser = async (user: XnatUser) => {
    const identifier = getUserIdentifier(user);
    if (!identifier) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove the user "${user.login}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteUserMutation.mutateAsync(identifier);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.login.localeCompare(b.login));
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return sortedUsers;
    const term = searchTerm.toLowerCase();
    return sortedUsers.filter((user) => {
      return (
        user.login?.toLowerCase().includes(term) ||
        `${user.firstname ?? ''} ${user.lastname ?? ''}`.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
      );
    });
  }, [sortedUsers, searchTerm]);

  const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            User Administration
          </h1>
          <p className="mt-1 flex items-center text-sm text-gray-500">
            <Shield className="mr-2 h-4 w-4" /> Manage XNAT user accounts, roles, and access.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 sm:mt-0">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <RefreshCw className={clsx('mr-2 h-4 w-4', { 'animate-spin': isFetching })} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                placeholder="Search users by name, username, or email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500 sm:mt-0">
              <Users className="mr-2 h-4 w-4" />
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-4 px-4 py-10 sm:px-6">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center sm:px-6">
              <div className="mx-auto max-w-md rounded-md bg-red-50 p-4 text-sm text-red-700">
                Failed to load users. Please verify your permissions and try again.
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-4 py-12 text-center sm:px-6">
              <div className="mx-auto max-w-md">
                <Users className="mx-auto h-10 w-10 text-gray-300" />
                <h3 className="mt-4 text-sm font-semibold text-gray-900">No users found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm
                    ? 'Try adjusting your search criteria.'
                    : 'Start by adding a new user to your XNAT instance.'}
                </p>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Access</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Updated</th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredUsers.map((user) => (
                  <tr key={getUserIdentifier(user)}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{user.login}</div>
                      <div className="text-sm text-gray-500">
                        {[user.firstname, user.lastname].filter(Boolean).join(' ')}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        {formatList(user.authorization?.roles)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label="Enabled" active={user.enabled} />
                        <StatusBadge label="Verified" active={user.verified} />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatList(user.authorization?.groups)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.last_modified)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(user)}
                          className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="inline-flex items-center rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/30 px-4 py-6">
          <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeModal === 'create' ? 'Add New User' : `Edit ${editingUser?.login}`}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeModal === 'create'
                  ? 'Provide account details and default access for the new user.'
                  : 'Update user details, account status, and access settings.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
              {formError && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={formState.login}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, login: event.target.value }))
                    }
                    disabled={activeModal === 'edit'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={formState.firstname}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, firstname: event.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={formState.lastname}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, lastname: event.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {activeModal === 'create' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        value={formState.password}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, password: event.target.value }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                      <input
                        type="password"
                        value={formState.confirmPassword}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, confirmPassword: event.target.value }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Roles</label>
                  <input
                    type="text"
                    value={formState.roles}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, roles: event.target.value }))
                    }
                    placeholder="Comma separated roles"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Groups</label>
                  <input
                    type="text"
                    value={formState.groups}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, groups: event.target.value }))
                    }
                    placeholder="Comma separated groups"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <label className="flex items-center rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formState.enabled}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, enabled: event.target.checked }))
                    }
                    className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Enabled account
                </label>
                <label className="flex items-center rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formState.verified}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, verified: event.target.checked }))
                    }
                    className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Verified email
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving…' : activeModal === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
