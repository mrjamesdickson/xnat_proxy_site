import { useState, useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Link2, Copy, Check, ChevronDown, Minimize2 } from 'lucide-react';
import { useTaskbar } from '../contexts/TaskbarContext';

export function RouteDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const location = useLocation();
  const params = useParams();
  const { upsertItem, removeItem } = useTaskbar();

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const searchObject = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return Object.fromEntries(searchParams.entries());
  }, [location.search]);
  const fullUrl = `${window.location.origin}${import.meta.env.BASE_URL}${location.pathname}${location.search}`.replace(/\/\//g, '/');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate taskbar subtitle
  const taskbarSubtitle = useMemo(() => {
    const paramCount = Object.keys(params).length;
    const queryCount = Object.keys(searchObject).length;
    return [
      paramCount > 0 ? `${paramCount} param${paramCount !== 1 ? 's' : ''}` : null,
      queryCount > 0 ? `${queryCount} query` : null,
    ].filter(Boolean).join(' · ') || location.pathname;
  }, [params, searchObject, location.pathname]);

  // Manage taskbar item when minimized
  useEffect(() => {
    if (isOpen && isMinimized) {
      // Add to taskbar when minimized
      upsertItem({
        id: 'route-debug',
        title: 'Route Info',
        subtitle: taskbarSubtitle,
        icon: <Link2 className="h-4 w-4" />,
        order: 4, // Fourth position
        onClick: () => {
          setIsMinimized(false);
        },
        onClose: () => {
          removeItem('route-debug');
          setIsMinimized(false);
          setIsOpen(false);
        },
      });
    } else {
      // Remove from taskbar when not minimized or not open
      removeItem('route-debug');
    }

    // Cleanup on unmount
    return () => {
      removeItem('route-debug');
    };
  }, [isOpen, isMinimized, taskbarSubtitle, upsertItem, removeItem]);

  // Hide widget when minimized (it's shown in taskbar)
  if (isMinimized) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[75]">
      {isOpen ? (
        <div className="bg-gray-900 text-gray-100 rounded-lg shadow-2xl border border-gray-700 w-[500px] max-w-[calc(100vw-2rem)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-400" />
              <span className="font-semibold text-sm">Route Info</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-gray-200 p-1"
                aria-label="Minimize to taskbar"
                title="Minimize to taskbar"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-200 p-1"
                aria-label="Close"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 text-xs font-mono">
            {/* Current Path */}
            <div>
              <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">Current Path</div>
              <div className="bg-gray-800 rounded px-2 py-1.5 text-blue-300 break-all">
                {location.pathname}
              </div>
            </div>

            {/* Route Parameters */}
            {Object.keys(params).length > 0 && (
              <div>
                <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">Route Parameters</div>
                <div className="bg-gray-800 rounded px-2 py-1.5">
                  {Object.entries(params).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-purple-400">{key}:</span>
                      <span className="text-green-300">"{value}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Query Parameters */}
            {Object.keys(searchObject).length > 0 && (
              <div>
                <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">Query Parameters</div>
                <div className="bg-gray-800 rounded px-2 py-1.5">
                  {Object.entries(searchObject).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-yellow-400">{key}:</span>
                      <span className="text-green-300">"{value}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full URL */}
            <div>
              <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">Full URL</div>
              <div className="bg-gray-800 rounded px-2 py-1.5 text-gray-300 break-all">
                {fullUrl}
              </div>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-sans font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy URL
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-gray-100 rounded-full p-3 shadow-lg border border-gray-700 transition-colors"
          title="Show route info"
        >
          <Link2 className="h-5 w-5 text-blue-400" />
        </button>
      )}
    </div>
  );
}
