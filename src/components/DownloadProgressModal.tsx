import { useDownload } from '../contexts/DownloadContext';
import { Loader2, CheckCircle2, XCircle, X, Minimize2 } from 'lucide-react';

const formatBytes = (bytes?: number) => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) {
    return undefined;
  }
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, exponent);
  const decimals = value >= 10 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[exponent]}`;
};

export function DownloadProgressModal() {
  const {
    downloadProgress,
    isDownloading,
    isProgressMinimized,
    setIsProgressMinimized,
    clearProgress,
    cancelDownloads,
  } = useDownload();

  if (downloadProgress.length === 0 || isProgressMinimized) {
    return null;
  }

  const progressStats = {
    completed: downloadProgress.filter(item => item.status === 'success').length,
    downloadedBytes: downloadProgress.reduce((acc, item) => acc + (item.sizeBytes ?? 0), 0),
  };

  const averageSize = progressStats.completed > 0
    ? progressStats.downloadedBytes / progressStats.completed
    : 0;
  const estimatedTotalBytes = averageSize * downloadProgress.length;
  const remainingBytes = Math.max(estimatedTotalBytes - progressStats.downloadedBytes, 0);

  const getProgressBarConfig = (status: string) => {
    switch (status) {
      case 'downloading':
        return { width: '60%', className: 'bg-blue-500 animate-pulse' };
      case 'success':
        return { width: '100%', className: 'bg-green-500' };
      case 'error':
        return { width: '100%', className: 'bg-red-500' };
      default:
        return { width: '0%', className: 'bg-gray-300' };
    }
  };

  const handleDismiss = () => {
    if (isDownloading) {
      cancelDownloads();
    } else {
      clearProgress();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Download Progress</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {progressStats.completed} of {downloadProgress.length} completed
              </p>
              {progressStats.downloadedBytes > 0 && (
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Downloaded {formatBytes(progressStats.downloadedBytes)}
                  {progressStats.completed < downloadProgress.length && (
                    <>
                      {' '}• est. total {formatBytes(estimatedTotalBytes)} (remaining {formatBytes(remainingBytes)})
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProgressMinimized(true)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                aria-label="Minimize downloads"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                aria-label={isDownloading ? 'Cancel downloads' : 'Close'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {downloadProgress.map((item) => {
              const progressConfig = getProgressBarConfig(item.status);
              return (
                <div
                  key={item.experimentId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800"
                >
                  {item.status === 'pending' && (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
                  )}
                  {item.status === 'downloading' && (
                    <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                  )}
                  {item.status === 'error' && (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.experimentLabel}
                    </p>
                    {item.status === 'error' && item.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{item.error}</p>
                    )}
                    {item.status === 'success' && typeof item.sizeBytes === 'number' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatBytes(item.sizeBytes)}
                      </p>
                    )}
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${progressConfig.className}`}
                        style={{ width: progressConfig.width }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    {item.status === 'pending' && 'Waiting'}
                    {item.status === 'downloading' && 'Downloading...'}
                    {item.status === 'success' && 'Complete'}
                    {item.status === 'error' && 'Failed'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={clearProgress}
            disabled={isDownloading}
            className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
              isDownloading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-gray-500'
                : 'bg-gray-600 text-white hover:bg-gray-700 dark:bg-slate-600 dark:hover:bg-slate-500'
            }`}
          >
            {isDownloading ? 'Downloading...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
