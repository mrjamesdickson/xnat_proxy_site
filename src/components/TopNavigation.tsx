import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Star,
  Search as SearchIcon,
  Plus,
  Upload as UploadIcon,
  Settings,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { useXnat } from '../contexts/XnatContext';
import type { XnatProject, XnatProjectAccess } from '../services/xnat-api';

function getProjectId(project: XnatProject | XnatProjectAccess): string {
  return (
    (project as XnatProject).id ||
    (project as XnatProjectAccess).ID ||
    (project as XnatProject).name ||
    (project as XnatProjectAccess).name ||
    ''
  );
}

interface MenuSectionProps {
  title: string;
  children: ReactNode;
  footerAction?: ReactNode;
}

function MenuSection({ title, children, footerAction }: MenuSectionProps) {
  return (
    <div className="flex-1 min-w-[200px] max-w-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {title}
      </p>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {children}
      </div>
      {footerAction && <div className="mt-3 text-xs text-blue-600">{footerAction}</div>}
    </div>
  );
}

export function TopNavigation() {
  const { client, currentUser } = useXnat();
  const navigate = useNavigate();
  const [browseOpen, setBrowseOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🔍 TopNavigation currentUser:', currentUser);
  }, [currentUser]);
  const [newOpen, setNewOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['nav', 'projects'],
    enabled: !!client,
    queryFn: () => client?.getProjects() ?? [],
  });

  const accessQuery = useQuery({
    queryKey: ['nav', 'projectAccess'],
    enabled: !!client,
    queryFn: () => client?.getProjectAccess() ?? [],
  });

  const savedSearchQuery = useQuery({
    queryKey: ['nav', 'savedSearches'],
    enabled: !!client,
    queryFn: () => client?.getSavedSearches() ?? [],
  });

  const myProjects = useMemo(() => {
    const access = accessQuery.data ?? [];
    if (access.length) {
      return access.slice(0, 15);
    }
    const projects = projectsQuery.data ?? [];
    return projects.slice(0, 15);
  }, [accessQuery.data, projectsQuery.data]);

  const allProjects = useMemo(() => (projectsQuery.data ?? []).slice(0, 30), [projectsQuery.data]);

  const savedSearches = useMemo(
    () => (savedSearchQuery.data ?? []).slice(0, 15),
    [savedSearchQuery.data]
  );

  const isAdmin = useMemo(() => {
    const roles = currentUser?.authorization?.roles ?? currentUser?.roles ?? [];
    return roles.some((role) => role?.toLowerCase().includes('admin'));
  }, [currentUser]);

  const closeMenus = () => {
    setBrowseOpen(false);
    setNewOpen(false);
    setAdminOpen(false);
  };

  const handleQuickSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = searchValue.trim();
    if (!term) {
      return;
    }
    navigate({
      pathname: '/search',
      search: new URLSearchParams({ term, type: 'all' }).toString(),
    });
    closeMenus();
  };

  const busy = projectsQuery.isLoading || accessQuery.isLoading || savedSearchQuery.isLoading;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center space-x-6">

            <nav className="hidden lg:flex items-center space-x-4 text-sm text-gray-600">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBrowseOpen((prev) => !prev);
                    setNewOpen(false);
                    setAdminOpen(false);
                  }}
                  className={clsx(
                    'inline-flex items-center rounded-md px-3 py-2 font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                    browseOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                  )}
                >
                  Browse
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>

                {browseOpen && (
                  <div
                    className="absolute z-40 mt-3 w-[680px] rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
                    onMouseLeave={closeMenus}
                  >
                    {busy ? (
                      <div className="text-sm text-gray-500">Loading navigation data…</div>
                    ) : (
                      <div className="flex space-x-6">
                        <MenuSection
                          title="My Projects"
                          footerAction={
                            <Link to="/projects" onClick={closeMenus} className="flex items-center gap-1">
                              View all projects
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          }
                        >
                          {myProjects.length === 0 ? (
                            <p className="text-xs text-gray-500">No projects available.</p>
                          ) : (
                            myProjects.map((project) => {
                              const id = getProjectId(project);
                              if (!id) return null;
                              return (
                                <Link
                                  key={id}
                                  to={`/projects/${encodeURIComponent(id)}`}
                                  onClick={closeMenus}
                                  className="flex items-center rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  <Folder className="mr-2 h-4 w-4 text-blue-500" />
                                  <span className="truncate font-medium text-gray-800">{project.name || id}</span>
                                </Link>
                              );
                            })
                          )}
                        </MenuSection>

                        <MenuSection title="All Projects">
                          {allProjects.length === 0 ? (
                            <p className="text-xs text-gray-500">No projects visible.</p>
                          ) : (
                            allProjects.map((project) => {
                              const id = getProjectId(project);
                              if (!id) return null;
                              return (
                                <Link
                                  key={id}
                                  to={`/projects/${encodeURIComponent(id)}`}
                                  onClick={closeMenus}
                                  className="flex items-center rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  <Folder className="mr-2 h-4 w-4 text-gray-400" />
                                  <span className="truncate text-gray-700">{project.name || id}</span>
                                </Link>
                              );
                            })
                          )}
                        </MenuSection>

                        <MenuSection title="Stored Searches">
                          {savedSearches.length === 0 ? (
                            <p className="text-xs text-gray-500">No stored searches defined.</p>
                          ) : (
                            savedSearches.map((search) => {
                              const id = search.ID || search.id || search.title;
                              if (!id) return null;
                              const searchParams = new URLSearchParams({
                                type: 'all',
                                term: '',
                              });
                              if (search.title) {
                                searchParams.set('term', search.title);
                              }
                              if (search.element_name) {
                                searchParams.set('element', search.element_name);
                              }
                              return (
                                <Link
                                  key={id}
                                  to={{ pathname: '/search', search: searchParams.toString() }}
                                  onClick={closeMenus}
                                  className="flex items-center rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  <Star className="mr-2 h-4 w-4 text-amber-500" />
                                  <span className="truncate text-gray-700">{search.title || id}</span>
                                </Link>
                              );
                            })
                          )}
                        </MenuSection>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNewOpen((prev) => !prev);
                    setBrowseOpen(false);
                    setAdminOpen(false);
                  }}
                  className={clsx(
                    'inline-flex items-center rounded-md px-3 py-2 font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                    newOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                  )}
                >
                  New
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>

                {newOpen && (
                  <div
                    className="absolute z-40 mt-3 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-xl"
                    onMouseLeave={closeMenus}
                  >
                    <Link
                      to="/projects"
                      onClick={closeMenus}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="mr-2 h-4 w-4 text-blue-500" />
                      Project
                    </Link>
                    <Link
                      to="/subjects"
                      onClick={closeMenus}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="mr-2 h-4 w-4 text-blue-500" />
                      Subject
                    </Link>
                    <Link
                      to="/experiments"
                      onClick={closeMenus}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="mr-2 h-4 w-4 text-blue-500" />
                      Experiment
                    </Link>
                  </div>
                )}
              </div>

              <Link
                to="/upload"
                onClick={closeMenus}
                className="inline-flex items-center rounded-md px-3 py-2 font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload
              </Link>

              {isAdmin && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminOpen((prev) => !prev);
                      setBrowseOpen(false);
                      setNewOpen(false);
                    }}
                    className={clsx(
                      'inline-flex items-center rounded-md px-3 py-2 font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                      adminOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                    )}
                  >
                    Admin
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </button>

                  {adminOpen && (
                    <div
                      className="absolute z-40 mt-3 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-xl"
                      onMouseLeave={closeMenus}
                    >
                      <Link
                        to="/admin/users"
                        onClick={closeMenus}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4 text-purple-500" />
                        User Administration
                      </Link>
                      <Link
                        to="/settings"
                        onClick={closeMenus}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="mr-2 h-4 w-4 text-gray-500" />
                        Site Settings
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-end space-x-5">
            <form onSubmit={handleQuickSearch} className="relative hidden md:block">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Quick search"
                className="w-56 rounded-md border-0 py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:w-64 focus:ring-2 focus:ring-blue-600 transition"
              />
            </form>

            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-gray-900">
                {currentUser?.username || currentUser?.login || 'User'}
              </div>
              <div className="text-xs text-gray-500 hidden sm:block">
                {currentUser?.lastSuccessfulLogin ? (
                  <span>
                    Last login: {new Date(currentUser.lastSuccessfulLogin).toLocaleString()}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Session active
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopNavigation;
