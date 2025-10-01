import { useMemo, useState, type ReactNode } from 'react';
import { useXnat } from '../contexts/XnatContext';
import { 
  User, 
  Settings, 
  LogOut, 
  Home,
  Folder,
  Users,
  FileImage,
  Upload,
  Search,
  Activity,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  Globe,
  Plus,
  ChevronRight,
  Star
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChatWidget } from './ChatWidget';
import type { XnatProject, XnatProjectAccess, XnatSavedSearch } from '../services/xnat-api';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Legacy Index', href: '/index', icon: Globe },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Subjects', href: '/subjects', icon: Users },
  { name: 'Experiments', href: '/experiments', icon: FileImage },
  { name: 'Processing', href: '/processing', icon: Activity },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'API Explorer', href: '/api', icon: BookOpen },
  { name: 'Admin', href: '/admin/users', icon: ShieldCheck },
];

const getProjectId = (project: XnatProject | XnatProjectAccess): string =>
  (project as XnatProject).id ||
  (project as XnatProjectAccess).ID ||
  (project as XnatProject).name ||
  (project as XnatProjectAccess).name ||
  '';

export function Layout({ children }: LayoutProps) {
  const { client, currentUser, logout, config } = useXnat();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  
  // Check if we're on the viewer route to adjust layout
  const isViewerRoute = location.pathname.includes('/viewer');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const openXnat = () => {
    if (!config?.baseURL) return;
    
    // Open XNAT directly in a new tab
    // Note: User will need to log in again due to browser security restrictions
    // that prevent sharing authentication across different origins
    window.open(config.baseURL, '_blank', 'noopener,noreferrer');
  };

  const handleQuickSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchValue.trim();
    if (!term) return;

    navigate({
      pathname: '/search',
      search: new URLSearchParams({ term, type: 'all' }).toString(),
    });
    setSearchValue('');
  };

  const projectsQuery = useQuery<XnatProject[]>({
    queryKey: ['nav', 'projects'],
    enabled: Boolean(client),
    queryFn: () => client?.getProjects() ?? [],
  });

  const accessQuery = useQuery<XnatProjectAccess[]>({
    queryKey: ['nav', 'project-access'],
    enabled: Boolean(client),
    queryFn: () => client?.getProjectAccess() ?? [],
  });

  const savedSearchQuery = useQuery<XnatSavedSearch[]>({
    queryKey: ['nav', 'saved-searches'],
    enabled: Boolean(client),
    queryFn: () => client?.getSavedSearches() ?? [],
  });

  const myProjects = useMemo(() => {
    const access = accessQuery.data ?? [];
    if (access.length) {
      return access.slice(0, 8);
    }
    return (projectsQuery.data ?? []).slice(0, 8);
  }, [accessQuery.data, projectsQuery.data]);

  const allProjects = useMemo(
    () => (projectsQuery.data ?? []).slice(0, 12),
    [projectsQuery.data]
  );

  const savedSearches = useMemo(
    () => (savedSearchQuery.data ?? []).slice(0, 8),
    [savedSearchQuery.data]
  );

  const isAdmin = useMemo(() => {
    const roles = currentUser?.authorization?.roles ?? currentUser?.roles ?? [];
    return roles.some((role) => role?.toLowerCase().includes('admin'));
  }, [currentUser]);

  const busyNav = projectsQuery.isLoading || accessQuery.isLoading || savedSearchQuery.isLoading;

  return (
    <div className={clsx("min-h-screen", isViewerRoute ? "bg-gray-100 flex flex-col" : "bg-gray-50 flex")}>
      {/* Left Sidebar - Hidden on viewer route */}
      {!isViewerRoute && (
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex items-center px-6 py-4 border-b border-gray-200">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">X</span>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-6">
              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Navigation</p>
                <div className="mt-3 space-y-2">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={clsx(
                          'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Quick Search</p>
                <form onSubmit={handleQuickSearch} className="mt-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute inset-y-0 left-3 h-4 w-4 self-center text-gray-400" />
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="Search projects, subjects…"
                      className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </form>
              </div>

              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Browse Projects</p>
                <div className="mt-3 space-y-3">
                  {busyNav ? (
                    <p className="px-3 text-xs text-gray-500">Loading project lists…</p>
                  ) : (
                    <>
                      {myProjects.length > 0 && (
                        <details className="group rounded-md border border-gray-200 bg-white">
                          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                            <span>My Projects</span>
                            <ChevronRight className="h-4 w-4 text-gray-400 transition group-open:rotate-90" />
                          </summary>
                          <div className="max-h-64 space-y-1 overflow-y-auto px-1 pb-3">
                            {myProjects.map((project) => {
                              const id = getProjectId(project);
                              if (!id) return null;
                              return (
                                <Link
                                  key={`my-${id}`}
                                  to={`/projects/${encodeURIComponent(id)}`}
                                  className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <Star className="mr-2 h-4 w-4 text-amber-500" />
                                  <span className="truncate">{project.name || id}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </details>
                      )}

                      {allProjects.length > 0 && (
                        <details className="group rounded-md border border-gray-200 bg-white">
                          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                            <span>All Projects</span>
                            <ChevronRight className="h-4 w-4 text-gray-400 transition group-open:rotate-90" />
                          </summary>
                          <div className="max-h-64 space-y-1 overflow-y-auto px-1 pb-3">
                            {allProjects.map((project) => {
                              const id = getProjectId(project);
                              if (!id) return null;
                              return (
                                <Link
                                  key={`all-${id}`}
                                  to={`/projects/${encodeURIComponent(id)}`}
                                  className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <Folder className="mr-2 h-4 w-4 text-blue-500" />
                                  <span className="truncate">{project.name || id}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </details>
                      )}

                      {myProjects.length === 0 && allProjects.length === 0 && (
                        <p className="px-3 text-xs text-gray-500">No projects available.</p>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-3 px-3">
                  <Link to="/projects" className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-500">
                    Manage projects
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </div>

              {savedSearches.length > 0 && (
                <div>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Saved Searches</p>
                  <div className="mt-3 space-y-1">
                    {savedSearches.map((search) => {
                      const savedId = search.ID || search.id;
                      if (!savedId) return null;
                      return (
                        <Link
                          key={`saved-${savedId}`}
                          to={{ pathname: '/search', search: new URLSearchParams({ saved: savedId.toString() }).toString() }}
                          className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <Search className="mr-2 h-4 w-4 text-emerald-500" />
                          <span className="truncate">{search.title || search.description || savedId.toString()}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Create New</p>
                <div className="mt-3 space-y-1">
                  <Link
                    to="/projects"
                    className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Plus className="mr-2 h-4 w-4 text-blue-500" />
                    Project
                  </Link>
                  <Link
                    to="/subjects"
                    className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Plus className="mr-2 h-4 w-4 text-blue-500" />
                    Subject
                  </Link>
                  <Link
                    to="/experiments"
                    className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Plus className="mr-2 h-4 w-4 text-blue-500" />
                    Experiment
                  </Link>
                  <Link
                    to="/upload"
                    className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Plus className="mr-2 h-4 w-4 text-blue-500" />
                    Upload Session
                  </Link>
                </div>
              </div>

              {isAdmin && (
                <div>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Admin Tools</p>
                  <div className="mt-3 space-y-1">
                    <Link
                      to="/admin/users"
                      className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4 text-purple-500" />
                      User Administration
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Settings className="mr-2 h-4 w-4 text-gray-500" />
                      Site Settings
                    </Link>
                  </div>
                </div>
              )}
            </nav>
            
            {/* XNAT Link */}
            {config?.baseURL && (
              <div className="px-4 py-2">
                <button
                  onClick={openXnat}
                  className="flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-3" />
                  Open XNAT
                </button>
              </div>
            )}
            
            {/* User info at bottom */}
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2">
                {config?.baseURL && new URL(config.baseURL).hostname}
              </div>
              <div className="relative group">
                <button className="flex items-center w-full text-sm rounded-lg p-2 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {currentUser?.firstname} {currentUser?.lastname}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {currentUser?.email}
                    </div>
                  </div>
                </button>
                
                <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">

        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Mobile menu and logo (shown on small screens) */}
              <div className="md:hidden flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">X</span>
                </div>
                <span className="text-xl font-bold text-gray-900">XNAT Portal</span>
              </div>
              
              {/* Desktop: Just user menu */}
              <div className="hidden md:flex md:ml-auto md:items-center md:space-x-4">
                <div className="text-sm text-gray-500">
                  {config?.baseURL && new URL(config.baseURL).hostname}
                </div>
                
                <div className="relative group">
                  <button className="flex items-center text-sm rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <span className="sr-only">Open user menu</span>
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="ml-2 text-gray-700 font-medium">
                      {currentUser?.firstname} {currentUser?.lastname}
                    </span>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                      {currentUser?.email}
                    </div>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile user menu */}
              <div className="md:hidden">
                <div className="relative group">
                  <button className="flex items-center text-sm rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                      {currentUser?.email}
                    </div>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        {!isViewerRoute && (
          <div className="md:hidden bg-white border-b border-gray-200">
            <nav className="px-4 py-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main Content */}
        {isViewerRoute ? (
          <div className="flex-1 min-h-0">
            {children}
          </div>
        ) : (
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full">
            {children}
          </main>
        )}
        {!isViewerRoute && <ChatWidget />}
      </div>
    </div>
  );
}
