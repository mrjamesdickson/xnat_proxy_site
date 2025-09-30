import type { ReactNode } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ChatWidget } from './ChatWidget';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Subjects', href: '/subjects', icon: Users },
  { name: 'Experiments', href: '/experiments', icon: FileImage },
  { name: 'Processing', href: '/processing', icon: Activity },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Search', href: '/search', icon: Search },
];

export function Layout({ children }: LayoutProps) {
  const { currentUser, logout, config } = useXnat();
  const location = useLocation();
  
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

  return (
    <div className={clsx("min-h-screen", isViewerRoute ? "bg-gray-100 flex flex-col" : "bg-gray-50 flex")}>
      {/* Left Sidebar - Hidden on viewer route */}
      {!isViewerRoute && (
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex items-center px-6 py-4 border-b border-gray-200">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">X</span>
              </div>
              <span className="text-xl font-bold text-gray-900">XNAT Portal</span>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
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