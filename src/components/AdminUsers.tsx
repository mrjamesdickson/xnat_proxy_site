import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Check } from 'lucide-react';
import { useXnat } from '../contexts/XnatContext';
import type { XnatActiveUserSessions, XnatUser, XnatUserRoleMap } from '../services/xnat-api';

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
    firstName?: string;
    lastname?: string;
    lastName?: string;
    email?: string;
    password?: string;
    enabled?: boolean;
    verified?: boolean;
    roles?: string[];
    groups?: string[];
  };
}

type BooleanFilter = 'all' | 'true' | 'false';
type LastLoginFilter = 'all' | 'has' | 'missing';

interface FilterState {
  id: string;
  username: string;
  name: string;
  email: string;
  roles: string;
  verified: BooleanFilter;
  enabled: BooleanFilter;
  active: BooleanFilter;
  lastLogin: LastLoginFilter;
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

function readValue(user: XnatUser, key: string): unknown {
  const record = user as Record<string, unknown>;
  return record[key];
}

function readString(user: XnatUser, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readValue(user, key);
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return undefined;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized);
  }
  return false;
}

function getBoolean(user: XnatUser, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = readValue(user, key);
    if (value !== undefined && value !== null) {
      return toBoolean(value);
    }
  }
  return fallback;
}

function toList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : String(item)))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\s,;|]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [String(value)];
}

function getListFromUser(user: XnatUser, keys: string[]): string[] {
  for (const key of keys) {
    const value = readValue(user, key);
    if (value !== undefined && value !== null) {
      return toList(value);
    }
  }
  return [];
}

function getRolesFromUser(user: XnatUser, additionalRoles: string[] = []): string[] {
  const authRoles = user.authorization?.roles ?? [];
  const directRoles = Array.isArray(user.roles) ? user.roles : [];
  const derivedRoles = getListFromUser(user, ['roles', 'Roles', 'role', 'Role', 'authorities', 'Authorities']);
  return Array.from(new Set(
    [...authRoles, ...directRoles, ...derivedRoles, ...additionalRoles]
      .map((role) => role?.trim())
      .filter((role): role is string => Boolean(role))
  ));
}

function getGroupsFromUser(user: XnatUser): string[] {
  if (user.authorization?.groups?.length) {
    return user.authorization.groups;
  }
  return getListFromUser(user, ['groups', 'Groups', 'group', 'Group']);
}

function getEmailValue(user: XnatUser): string {
  return (
    readString(user, ['email', 'Email', 'EMAIL', 'mail', 'MAIL']) ??
    ''
  );
}

function getUserNumericId(user: XnatUser): string {
  return (
    readString(user, ['xdat_user_id', 'XDAT_USER_ID', 'id', 'ID']) ??
    ''
  );
}

function getLastLoginRaw(user: XnatUser): string | number | undefined {
  const keys = ['lastSuccessfulLogin', 'last_successful_login', 'last_login', 'lastLogin', 'last_login_date', 'last_access_time', 'last_modified', 'lastModified'];
  for (const key of keys) {
    const value = readValue(user, key);
    if (value === undefined || value === null) continue;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return undefined;
}

function getUserLogin(user: XnatUser): string {
  return readString(user, ['login', 'LOGIN', 'username', 'USERNAME']) ?? '';
}

function getUserIdentifier(user: XnatUser): string {
  const login = getUserLogin(user);
  if (login) return login;
  return getUserNumericId(user);
}

function getUserSortKey(user: XnatUser): string {
  const preferred =
    getUserLogin(user) || `${getUserDisplayName(user)}`;
  const fallback = getUserNumericId(user);
  return (preferred || fallback).toLowerCase();
}

function getUserDisplayName(user: XnatUser): string {
  const first =
    readString(user, ['firstname', 'firstName', 'Firstname', 'FIRSTNAME']) ?? '';
  const last =
    readString(user, ['lastname', 'lastName', 'Lastname', 'LASTNAME']) ?? '';
  const name = `${first} ${last}`.trim();
  if (name) return name;
  const identifier = getUserIdentifier(user);
  return identifier || 'Unknown user';
}

function getUserTableName(user: XnatUser): string {
  const first =
    readString(user, ['firstname', 'firstName', 'Firstname', 'FIRSTNAME']) ?? '';
  const last =
    readString(user, ['lastname', 'lastName', 'Lastname', 'LASTNAME']) ?? '';
  if (first && last) {
    return `${last}, ${first}`;
  }
  return first || last || '—';
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'userMessage' in error) {
    const userMessage = (error as { userMessage?: unknown }).userMessage;
    if (typeof userMessage === 'string' && userMessage.trim().length > 0) {
      return userMessage;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatList(value?: string[] | string): string {
  return toList(value).join(', ');
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatDate(value?: string | number): string {
  if (value === undefined || value === null || value === '') return '—';

  const toDate = (input: string | number): Date => {
    if (typeof input === 'number') {
      return new Date(input);
    }
    const trimmed = input.trim();
    if (/^-?\d+$/.test(trimmed)) {
      const asNumber = Number.parseInt(trimmed, 10);
      return new Date(asNumber);
    }
    return new Date(trimmed);
  };

  const parsed = toDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleString();
}

export function AdminUsers() {
  const { client } = useXnat();
  const queryClient = useQueryClient();

  const [activeModal, setActiveModal] = useState<'create' | 'edit' | null>(null);
  const [formState, setFormState] = useState<UserFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<XnatUser | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    id: '',
    username: '',
    name: '',
    email: '',
    roles: '',
    verified: 'all',
    enabled: 'all',
    active: 'all',
    lastLogin: 'all',
  });

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const [userScope, setUserScope] = useState<'current' | 'all'>('current');

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-users', userScope],
    queryFn: async () => {
      if (!client) return [] as XnatUser[];
      return client.getUsers({ scope: userScope });
    },
    enabled: !!client,
  });

  const { data: roleMap = {} } = useQuery({
    queryKey: ['admin-user-rolemap'],
    queryFn: async () => {
      if (!client) return {} as XnatUserRoleMap;
      return client.getUserRoleMap();
    },
    enabled: !!client,
  });

  const roleMapByUser = useMemo(() => {
    const result: Record<string, string[]> = {};
    Object.entries(roleMap).forEach(([role, usernames]) => {
      usernames?.forEach((name) => {
        if (!name) return;
        if (!result[name]) {
          result[name] = [];
        }
        if (!result[name].includes(role)) {
          result[name].push(role);
        }
      });
    });
    return result;
  }, [roleMap]);

  const { data: activeUsers = {} } = useQuery({
    queryKey: ['admin-user-active'],
    queryFn: async () => {
      if (!client) return {} as XnatActiveUserSessions;
      return client.getActiveUsers();
    },
    enabled: !!client,
    staleTime: 60_000,
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: {
      username: string;
      login: string;
      firstName: string;
      lastName: string;
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
      queryClient.invalidateQueries({ queryKey: ['admin-users'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['admin-user-rolemap'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-active'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ identifier, data }: UpdateUserMutationInput) => {
      if (!client) throw new Error('XNAT client not initialized');
      return client.updateUser(identifier, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['admin-user-rolemap'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-active'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (identifier: string) => {
      if (!client) throw new Error('XNAT client not initialized');
      return client.deleteUser(identifier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['admin-user-rolemap'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-active'] });
    },
  });

  const handleOpenCreateModal = () => {
    setFormState(initialFormState);
    setFormError(null);
    setEditingUser(null);
    setActiveModal('create');
  };

  const handleOpenEditModal = (user: XnatUser) => {
    const username = getUserLogin(user);
    const mergedRoles = getRolesFromUser(user, roleMapByUser[username] ?? []);
    setFormState({
      login: username,
      firstname:
        readString(user, ['firstname', 'firstName', 'Firstname', 'FIRSTNAME']) ?? '',
      lastname:
        readString(user, ['lastname', 'lastName', 'Lastname', 'LASTNAME']) ?? '',
      email: getEmailValue(user),
      password: '',
      confirmPassword: '',
      enabled: getBoolean(user, ['enabled', 'ENABLED', 'status'], true),
      verified: getBoolean(user, ['verified', 'VERIFIED'], false),
      roles: formatList(mergedRoles),
      groups: formatList(getGroupsFromUser(user)),
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
          username: formState.login.trim(),
          login: formState.login.trim(),
          firstName: formState.firstname.trim(),
          lastName: formState.lastname.trim(),
          email: formState.email.trim(),
          password: formState.password,
          enabled: formState.enabled,
          verified: formState.verified,
          roles,
          groups,
        });
        closeModal();
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to create user.');
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
            firstName: formState.firstname.trim(),
            lastname: formState.lastname.trim(),
            lastName: formState.lastname.trim(),
            email: formState.email.trim(),
            enabled: formState.enabled,
            verified: formState.verified,
            roles,
            groups,
          },
        });
        closeModal();
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to update user.');
        setFormError(message);
      }
    }
  };

  const handleDeleteUser = async (user: XnatUser) => {
    const identifier = getUserIdentifier(user);
    if (!identifier) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove the user "${getUserLogin(user) || identifier}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteUserMutation.mutateAsync(identifier);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => getUserSortKey(a).localeCompare(getUserSortKey(b)));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalized = {
      id: filters.id.trim().toLowerCase(),
      username: filters.username.trim().toLowerCase(),
      name: filters.name.trim().toLowerCase(),
      email: filters.email.trim().toLowerCase(),
      roles: filters.roles.trim().toLowerCase(),
      verified: filters.verified,
      enabled: filters.enabled,
      active: filters.active,
      lastLogin: filters.lastLogin,
    };

    return sortedUsers.filter((user) => {
      const usernameRaw = getUserLogin(user);
      const userId = getUserNumericId(user).toLowerCase();
      const username = usernameRaw.toLowerCase();
      const displayName = getUserDisplayName(user).toLowerCase();
      const emailValue = getEmailValue(user);
      const email = emailValue.toLowerCase();
      const roleList = getRolesFromUser(user, roleMapByUser[usernameRaw] ?? []);
      const rolesText = roleList.join(', ').toLowerCase();
      const isVerified = getBoolean(user, ['verified', 'VERIFIED'], Boolean(user.verified));
      const isEnabled = getBoolean(user, ['enabled', 'ENABLED', 'status'], Boolean(user.enabled));
      const activeRecord = activeUsers[usernameRaw];
      const hasActiveSessions = Boolean(activeRecord?.count && activeRecord.count > 0);
      const lastLoginRaw = getLastLoginRaw(user);
      const hasLastLogin =
        lastLoginRaw !== undefined &&
        lastLoginRaw !== null &&
        String(lastLoginRaw).trim() !== '';

      if (normalized.id && !userId.includes(normalized.id)) {
        return false;
      }

      if (normalized.username && !username.includes(normalized.username)) {
        return false;
      }

      if (normalized.name && !displayName.includes(normalized.name)) {
        return false;
      }

      if (normalized.email && !email.includes(normalized.email)) {
        return false;
      }

      if (normalized.roles && !rolesText.includes(normalized.roles)) {
        return false;
      }

      if (
        normalized.verified !== 'all' &&
        ((normalized.verified === 'true' && !isVerified) ||
          (normalized.verified === 'false' && isVerified))
      ) {
        return false;
      }

      if (
        normalized.enabled !== 'all' &&
        ((normalized.enabled === 'true' && !isEnabled) ||
          (normalized.enabled === 'false' && isEnabled))
      ) {
        return false;
      }

      if (
        normalized.active !== 'all' &&
        ((normalized.active === 'true' && !hasActiveSessions) ||
          (normalized.active === 'false' && hasActiveSessions))
      ) {
        return false;
      }

      if (
        normalized.lastLogin !== 'all' &&
        ((normalized.lastLogin === 'has' && !hasLastLogin) ||
          (normalized.lastLogin === 'missing' && hasLastLogin))
      ) {
        return false;
      }

      return true;
    });
  }, [sortedUsers, filters, roleMap, activeUsers]);

  const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

  const handleReloadUserList = () => {
    setUserScope('current');
    queryClient.invalidateQueries({ queryKey: ['admin-users'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['admin-user-rolemap'] });
    queryClient.invalidateQueries({ queryKey: ['admin-user-active'] });
  };

  const handleLoadAllUsers = () => {
    setUserScope('all');
    queryClient.invalidateQueries({ queryKey: ['admin-users'], exact: false });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-semibold text-gray-900">Manage Users</h1>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Create New User
            </button>
            <button
              type="button"
              onClick={handleReloadUserList}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Reload User List
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <HelpCircle className="h-4 w-4" />
            </span>
            <button
              type="button"
              onClick={handleLoadAllUsers}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Load All Users
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-4 px-4 py-10">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto max-w-md rounded-md bg-red-50 p-4 text-sm text-red-700">
                Failed to load users. Please verify your permissions and try again.
              </div>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Username</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Roles</th>
                  <th className="px-4 py-2 text-center">Verified</th>
                  <th className="px-4 py-2 text-center">Enabled</th>
                  <th className="px-4 py-2 text-center">Active</th>
                  <th className="px-4 py-2">Last Login</th>
                  <th className="px-4 py-2"></th>
                </tr>
                <tr className="bg-white text-[13px] font-normal text-gray-600">
                  <th className="border-t border-gray-200 px-4 py-2">
                    <input
                      value={filters.id}
                      onChange={(event) => handleFilterChange('id', event.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                      placeholder="Filter by ID"
                    />
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2">
                    <input
                      value={filters.username}
                      onChange={(event) => handleFilterChange('username', event.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                      placeholder="Filter by Username"
                    />
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2">
                    <input
                      value={filters.name}
                      onChange={(event) => handleFilterChange('name', event.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                      placeholder="Filter by Name"
                    />
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2">
                    <input
                      value={filters.email}
                      onChange={(event) => handleFilterChange('email', event.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                      placeholder="Filter by Email"
                    />
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2">
                    <input
                      value={filters.roles}
                      onChange={(event) => handleFilterChange('roles', event.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                      placeholder="Filter by Roles"
                    />
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2 text-center">
                    <select
                      value={filters.verified}
                      onChange={(event) => handleFilterChange('verified', event.target.value as BooleanFilter)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    >
                      <option value="all">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2 text-center">
                    <select
                      value={filters.enabled}
                      onChange={(event) => handleFilterChange('enabled', event.target.value as BooleanFilter)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    >
                      <option value="all">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2 text-center">
                    <select
                      value={filters.active}
                      onChange={(event) => handleFilterChange('active', event.target.value as BooleanFilter)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    >
                      <option value="all">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2">
                    <select
                      value={filters.lastLogin}
                      onChange={(event) => handleFilterChange('lastLogin', event.target.value as LastLoginFilter)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    >
                      <option value="all">All</option>
                      <option value="has">Has Date</option>
                      <option value="missing">No Date</option>
                    </select>
                  </th>
                  <th className="border-t border-gray-200 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                      No users match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const identifier = getUserIdentifier(user);
                    const numericId = getUserNumericId(user) || identifier;
                    const username = getUserLogin(user) || identifier;
                    const tableName = getUserTableName(user);
                    const email = getEmailValue(user);
                    const roleList = getRolesFromUser(user, roleMapByUser[username] ?? []);
                    const rolesText = roleList.length ? roleList.join(', ') : '—';
                    const isVerified = getBoolean(user, ['verified', 'VERIFIED'], Boolean(user.verified));
                    const isEnabled = getBoolean(user, ['enabled', 'ENABLED', 'status'], Boolean(user.enabled));
                    const activeInfo = activeUsers[username];
                    const hasActiveSessions = Boolean(activeInfo?.count && activeInfo.count > 0);
                    const lastLoginRaw = getLastLoginRaw(user) ?? user.lastSuccessfulLogin ?? user.last_modified;
                    const lastLogin = formatDate(lastLoginRaw ?? '');

                    return (
                      <tr key={identifier} className="align-middle">
                        <td className="border-t px-4 py-2 text-blue-600">
                          <a href="#" className="hover:underline">
                            {numericId || '—'}
                          </a>
                        </td>
                        <td className="border-t px-4 py-2">
                          <a href="#" className="text-blue-600 hover:underline">
                            {username}
                          </a>
                        </td>
                        <td className="border-t px-4 py-2">
                          <a href="#" className="text-blue-600 hover:underline">
                            {tableName}
                          </a>
                        </td>
                        <td className="border-t px-4 py-2">
                          {email ? (
                            <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                              {email}
                            </a>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="border-t px-4 py-2 text-gray-600">
                          <span className="block max-w-xs truncate" title={rolesText}>
                            {rolesText}
                          </span>
                        </td>
                        <td className="border-t px-4 py-2 text-center">
                          {isVerified ? <Check className="mx-auto h-4 w-4 text-blue-600" /> : null}
                        </td>
                        <td className="border-t px-4 py-2 text-center">
                          {isEnabled ? <Check className="mx-auto h-4 w-4 text-blue-600" /> : null}
                        </td>
                        <td className="border-t px-4 py-2 text-center">
                          {hasActiveSessions ? <Check className="mx-auto h-4 w-4 text-blue-600" /> : null}
                        </td>
                        <td className="border-t px-4 py-2 text-gray-600">{lastLogin}</td>
                        <td className="border-t px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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
