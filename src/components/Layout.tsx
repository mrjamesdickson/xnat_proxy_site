import { useEffect, useMemo, useState, type ReactNode, type ChangeEvent } from 'react';
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
  Star,
  Sun,
  Moon,
  FolderInput,
  FileArchive,
  Layers,
  Monitor,
  ExternalLinkIcon,
  X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChatWidget } from './ChatWidget';
import { RouteDebugPanel } from './RouteDebugPanel';
import { ContainerJobsWidget } from './ContainerJobsWidget';
import { DownloadProgressModal } from './DownloadProgressModal';
import { TaskbarProvider } from '../contexts/TaskbarContext';
import { Taskbar } from './Taskbar';
import { DownloadProvider } from '../contexts/DownloadContext';
import { useContainerJobs } from '../contexts/ContainerJobsContext';
import type { XnatProject, XnatProjectAccess, XnatSavedSearch } from '../services/xnat-api';
import { useTheme } from '../contexts/ThemeContext';
import { THEME_OPTIONS, type ThemeMode } from '../contexts/theme-types';

interface LayoutProps {
  children: ReactNode;
}

const themeLabels: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  ocean: 'Ocean Breeze',
  forest: 'Forest Canopy',
  midnight: 'Midnight Glow',
};

const themeOptions = THEME_OPTIONS.map((value) => ({
  value,
  label: themeLabels[value],
}));

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Legacy Index', href: '/index', icon: Globe },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Subjects', href: '/subjects', icon: Users },
  { name: 'Experiments', href: '/experiments', icon: FileImage },
  { name: 'Prearchive', href: '/prearchive', icon: FolderInput },
  { name: 'Processing', href: '/processing', icon: Activity },
  {
    name: 'Upload',
    icon: Upload,
    submenu: [
      { name: 'DICOM Upload', href: '/upload', icon: Upload },
      { name: 'Compressed Uploader', href: '/upload/compressed', icon: FileArchive },
      { name: 'Compressed Uploader (Popup)', href: '/?popup=true#/upload/compressed', icon: ExternalLinkIcon, isPopup: true }
    ]
  },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Monitoring', href: '/monitoring', icon: Monitor },
  { name: 'API Explorer', href: '/api', icon: BookOpen },
  {
    name: 'Administer',
    icon: ShieldCheck,
    submenu: [
      { name: 'Site Administration', href: '/admin', icon: Settings },
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Groups', href: '/admin/groups', icon: Users },
      { name: 'Data Types', href: '/admin/data-types', icon: FileImage },
      { name: 'Send Email', href: '/admin/email', icon: Activity },
      { name: 'Automation', href: '/admin/automation', icon: Activity },
      { name: 'Stored Searches', href: '/admin/stored-searches', icon: Search },
      { name: 'Plugin Settings', href: '/admin/plugins', icon: Settings },
      { name: 'Event Service', href: '/admin/event-service', icon: Activity },
      { name: 'XNAT Task Settings', href: '/admin/tasks', icon: Activity }
    ]
  },
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

  // Check if popup mode is enabled
  // With HashRouter, query params are in window.location.search, not in useSearchParams
  const isPopupMode = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('popup') === 'true';
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Layout currentUser:', JSON.stringify(currentUser, null, 2));
  }, [currentUser]);

  // Intercept link clicks in popup mode to navigate parent window
  useEffect(() => {
    if (!isPopupMode || !window.opener || window.opener.closed) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href) {
        // Only intercept internal navigation links (not external links or # anchors)
        const url = new URL(link.href);
        const isInternal = url.origin === window.location.origin;
        const isHashOnly = link.getAttribute('href')?.startsWith('#');

        if (isInternal && !isHashOnly) {
          e.preventDefault();
          e.stopPropagation();
          // Navigate parent window to the full version (without popup parameter)
          const pathname = url.pathname + url.search.replace(/[?&]popup=true(&|$)/, '$1').replace(/^&/, '?').replace(/[?&]$/, '');
          window.opener.location.href = url.origin + pathname + url.hash;
          window.opener.focus();
          // Close the popup after navigating parent
          window.close();
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isPopupMode]);
  const { theme, setTheme } = useTheme();
  const { isWidgetOpen, toggleWidget, closeWidget } = useContainerJobs();

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

  const handleThemeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextTheme = event.target.value as ThemeMode;
    setTheme(nextTheme);
  };

  return (
    <TaskbarProvider>
      <DownloadProvider>
      <div
        className={clsx(
          'min-h-screen text-gray-900 dark:text-gray-100',
          isViewerRoute ? 'bg-gray-100 dark:bg-slate-900 flex flex-col' : 'bg-gray-50 dark:bg-slate-950 flex'
        )}
      >
        {/* Left Sidebar - Hidden on viewer route or popup mode */}
        {!isViewerRoute && !isPopupMode && (
          <div className="hidden md:flex md:w-64 md:flex-col">
            <div className="flex flex-col flex-grow border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {/* Logo */}
            <div className="flex items-center border-b border-gray-200 px-6 py-4 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-white font-bold text-sm">X</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-6">
              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Navigation
                </p>
                <div className="mt-3 space-y-2">
                  {navigation.map((item) => {
                    // Check if item has submenu
                    if ('submenu' in item && item.submenu) {
                      const isAnySubmenuActive = item.submenu.some(sub => location.pathname === sub.href);
                      return (
                        <details key={item.name} className="group">
                          <summary className={clsx(
                            'flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium transition-colors list-none',
                            isAnySubmenuActive
                              ? 'border-r-2 border-blue-600 bg-blue-100 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white'
                          )}>
                            <item.icon className="mr-3 h-5 w-5" />
                            <span className="flex-1">{item.name}</span>
                            <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                          </summary>
                          <div className="mt-1 ml-8 space-y-1">
                            {item.submenu.map((subItem) => {
                              const isActive = location.pathname === subItem.href;
                              const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                                if ('isPopup' in subItem && subItem.isPopup) {
                                  e.preventDefault();
                                  window.open(subItem.href, 'morpheus-popup', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                                }
                              };
                              return (
                                <Link
                                  key={subItem.name}
                                  to={subItem.href}
                                  onClick={handleClick}
                                  className={clsx(
                                    'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                                    isActive
                                      ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/20 dark:text-blue-200'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white'
                                  )}
                                >
                                  <subItem.icon className="mr-2 h-4 w-4" />
                                  {subItem.name}
                                </Link>
                              );
                            })}
                          </div>
                        </details>
                      );
                    }

                    // Regular menu item without submenu
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={clsx(
                          'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'border-r-2 border-blue-600 bg-blue-100 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white'
                        )}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Quick Search
                </p>
                <form onSubmit={handleQuickSearch} className="mt-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute inset-y-0 left-3 h-4 w-4 self-center text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="Search projects, subjects…"
                      className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-500"
                    />
                  </div>
                </form>
              </div>

              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Browse Projects
                </p>
                <div className="mt-3 space-y-3">
                  {busyNav ? (
                    <p className="px-3 text-xs text-gray-500 dark:text-gray-400">Loading project lists…</p>
                  ) : (
                    <>
                      {myProjects.length > 0 && (
                        <details className="group rounded-md border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-200">
                            <span>My Projects</span>
                            <ChevronRight className="h-4 w-4 text-gray-400 transition group-open:rotate-90 dark:text-gray-500" />
                          </summary>
                          <div className="max-h-64 space-y-1 overflow-y-auto px-1 pb-3">
                            {myProjects.map((project) => {
                              const id = getProjectId(project);
                              if (!id) return null;
                              return (
                                <Link
                                  key={`my-${id}`}
                                  to={`/projects/${encodeURIComponent(id)}`}
                                  className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-slate-700 dark:hover:text-blue-200"
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
                        <details className="group rounded-md border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-200">
                            <span>All Projects</span>
                            <ChevronRight className="h-4 w-4 text-gray-400 transition group-open:rotate-90 dark:text-gray-500" />
                          </summary>
                          <div className="max-h-64 space-y-1 overflow-y-auto px-1 pb-3">
                            {allProjects.map((project) => {
                              const id = getProjectId(project);
                              if (!id) return null;
                              return (
                                <Link
                                  key={`all-${id}`}
                                  to={`/projects/${encodeURIComponent(id)}`}
                                  className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-slate-700 dark:hover:text-blue-200"
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
                        <p className="px-3 text-xs text-gray-500 dark:text-gray-400">No projects available.</p>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-3 px-3">
                  <Link
                    to="/projects"
                    className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    Manage projects
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </div>

              {savedSearches.length > 0 && (
                <div>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Saved Searches
                  </p>
                  <div className="mt-3 space-y-1">
                    {savedSearches.map((search) => {
                      const savedId = search.ID || search.id;
                      if (!savedId) return null;
                      return (
                        <Link
                          key={`saved-${savedId}`}
                          to={{ pathname: '/search', search: new URLSearchParams({ saved: savedId.toString() }).toString() }}
                          className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-white"
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
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Create New
                </p>
                <div className="mt-3 space-y-1">
                  <Link
                    to="/projects"
                    className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Plus className="mr-2 h-4 w-4 text-blue-500" />
                    Project
                  </Link>
                  <Link
                    to="/subjects"
                    className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Plus className="mr-2 h-4 w-4 text-blue-500" />
                    Subject
                  </Link>
                  <Link
                    to="/experiments"
                    className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Plus className="mr-2 h-4 w-4 text-blue-500" />
                    Experiment
                  </Link>
                  <Link
                    to="/upload"
                    className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Plus className="mr-2 h-4 w-4 text-blue-500" />
                    Upload Session
                  </Link>
                </div>
              </div>

              {isAdmin && (
                <div>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Admin Tools
                  </p>
                  <div className="mt-3 space-y-1">
                    <Link
                      to="/admin/users"
                      className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4 text-purple-500" />
                      User Administration
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-white"
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
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-slate-800 dark:hover:text-blue-200"
                >
                  <ExternalLink className="mr-3 h-4 w-4" />
                  Open XNAT
                </button>
              </div>
            )}

            {/* User info at bottom */}
            <div className="border-t border-gray-200 px-4 py-4 dark:border-slate-800">
              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {config?.baseURL && new URL(config.baseURL).hostname}
              </div>
              <div className="relative group">
                <button className="flex w-full items-center rounded-lg bg-gray-50 p-2 text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:hover:bg-slate-700">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-slate-700">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {currentUser?.firstname && currentUser?.lastname
                        ? `${currentUser.firstname} ${currentUser.lastname}`
                        : currentUser?.username || currentUser?.login || 'User'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {currentUser?.email || (config?.baseURL && new URL(config.baseURL).hostname)}
                    </div>
                  </div>
                </button>

                <div className="invisible absolute bottom-full left-0 z-50 mb-2 w-full rounded-md bg-white py-1 opacity-0 shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:bg-slate-900 dark:text-gray-100 dark:ring-white/10">
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
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

        {/* Popup Mode Header - Simple header with logo and close button */}
        {isPopupMode && (
          <header className="flex-shrink-0 border-b border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex h-14 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                    <span className="text-white font-bold text-sm">M</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Morpheus</span>
                </div>
                <button
                  onClick={() => window.close()}
                  className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200"
                  aria-label="Close popup"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Top Header - Hidden in popup mode */}
        {!isPopupMode && (
        <header className="flex-shrink-0 border-b border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Mobile menu and logo (shown on small screens) */}
              <div className="flex items-center md:hidden">
                <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <span className="text-sm font-bold text-white">X</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">XNAT Portal</span>
              </div>

              {/* Desktop: Just user menu */}
              <div className="hidden md:flex md:ml-auto md:items-center md:space-x-4">
                <button
                  onClick={toggleWidget}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isWidgetOpen
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/60'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
                  )}
                  aria-label="Toggle Container Jobs"
                  title="Container Jobs"
                >
                  <Layers className="h-4 w-4" />
                  <span>Jobs</span>
                </button>

                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="theme-select"
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-300"
                  >
                    {theme === 'dark' || theme === 'midnight' ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    <span>Theme</span>
                  </label>
                  <select
                    id="theme-select"
                    value={theme}
                    onChange={handleThemeChange}
                    className="rounded-md border border-gray-200 bg-white py-1.5 pl-2 pr-8 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  >
                    {themeOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-300">
                  {config?.baseURL && new URL(config.baseURL).hostname}
                </div>

                <div className="relative group">
                  <button className="flex items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-slate-800 dark:text-gray-100 dark:focus:ring-offset-slate-900">
                    <span className="sr-only">Open user menu</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-slate-700">
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
                    </div>
                    <span className="ml-2 font-medium text-gray-700 dark:text-gray-100">
                      {currentUser?.firstname && currentUser?.lastname
                        ? `${currentUser.firstname} ${currentUser.lastname}`
                        : currentUser?.username || currentUser?.login || 'User'}
                    </span>
                  </button>

                  <div className="invisible absolute right-0 z-50 mt-2 w-48 rounded-md bg-white py-1 opacity-0 shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:bg-slate-900 dark:text-gray-100 dark:ring-white/10">
                    <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-500 dark:border-slate-800 dark:text-gray-300">
                      {currentUser?.email}
                    </div>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile user menu */}
              <div className="md:hidden">
                <div className="relative group">
                  <button className="flex items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-slate-800 dark:text-gray-100 dark:focus:ring-offset-slate-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-slate-700">
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
                    </div>
                  </button>

                  <div className="invisible absolute right-0 z-50 mt-2 w-48 rounded-md bg-white py-1 opacity-0 shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:bg-slate-900 dark:text-gray-100 dark:ring-white/10">
                    <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-500 dark:border-slate-800 dark:text-gray-300">
                      {currentUser?.email}
                    </div>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Mobile Navigation - Hidden in popup mode */}
        {!isViewerRoute && !isPopupMode && (
          <div className="md:hidden border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <nav className="px-4 py-2 space-y-1">
              {navigation.map((item) => {
                // Check if item has submenu
                if ('submenu' in item && item.submenu) {
                  const isAnySubmenuActive = item.submenu.some(sub => location.pathname === sub.href);
                  return (
                    <details key={item.name} className="group">
                      <summary className={clsx(
                        'flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium transition-colors list-none',
                        isAnySubmenuActive
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white'
                      )}>
                        <item.icon className="mr-3 h-4 w-4" />
                        <span className="flex-1">{item.name}</span>
                        <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                      </summary>
                      <div className="mt-1 ml-7 space-y-1">
                        {item.submenu.map((subItem) => {
                          const isActive = location.pathname === subItem.href;
                          const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                            if ('isPopup' in subItem && subItem.isPopup) {
                              e.preventDefault();
                              window.open(subItem.href, 'morpheus-popup', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                            }
                          };
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              onClick={handleClick}
                              className={clsx(
                                'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                                isActive
                                  ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/20 dark:text-blue-200'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white'
                              )}
                            >
                              <subItem.icon className="mr-2 h-4 w-4" />
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    </details>
                  );
                }

                // Regular menu item without submenu
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-3">
                <label
                  htmlFor="mobile-theme-select"
                  className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300"
                >
                  {theme === 'dark' || theme === 'midnight' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  <span>Theme</span>
                </label>
                <select
                  id="mobile-theme-select"
                  value={theme}
                  onChange={handleThemeChange}
                  className="w-full rounded-md border border-gray-200 bg-white py-2 pl-2 pr-8 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                >
                  {themeOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content */}
        {isViewerRoute ? (
          <div className="flex-1 min-h-0">
            {children}
          </div>
        ) : (
          <main className={clsx(
            'flex-1 w-full',
            isPopupMode ? 'p-4' : 'px-4 sm:px-6 lg:px-8 py-8'
          )}>
            {children}
          </main>
        )}
        {!isViewerRoute && !isPopupMode && <ChatWidget />}
        {!isPopupMode && <ContainerJobsWidget isOpen={isWidgetOpen} onClose={closeWidget} />}
        {!isPopupMode && <RouteDebugPanel />}
        <DownloadProgressModal />
        {!isPopupMode && <Taskbar />}
      </div>
      </div>
      </DownloadProvider>
    </TaskbarProvider>
  );
}
