import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Link2, Copy, Check, ChevronDown } from 'lucide-react';

export function RouteDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const location = useLocation();
  const params = useParams();

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const searchParams = new URLSearchParams(location.search);
  const searchObject = Object.fromEntries(searchParams.entries());
  const fullUrl = `${window.location.origin}${import.meta.env.BASE_URL}${location.pathname}${location.search}`.replace(/\/\//g, '/');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-gray-900 text-gray-100 rounded-lg shadow-2xl border border-gray-700 w-[500px] max-w-[calc(100vw-2rem)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-400" />
              <span className="font-semibold text-sm">Route Info</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-200"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
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
