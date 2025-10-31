import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { useTaskbar } from './TaskbarContext';
import { Download, RefreshCw } from 'lucide-react';

export interface DownloadProgress {
  experimentId: string;
  experimentLabel: string;
  subjectId?: string;
  subjectLabel?: string;
  sizeBytes?: number;
  status: 'pending' | 'downloading' | 'success' | 'error';
  error?: string;
}

interface DownloadContextType {
  downloadProgress: DownloadProgress[];
  isDownloading: boolean;
  isProgressMinimized: boolean;
  setIsProgressMinimized: (minimized: boolean) => void;
  startDownloads: (items: DownloadProgress[], downloadFn: (item: DownloadProgress, index: number) => Promise<void>) => Promise<void>;
  cancelDownloads: () => void;
  clearProgress: () => void;
  updateProgress: (index: number, update: Partial<DownloadProgress>) => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

const TASKBAR_ITEM_ID = 'project-download-progress';

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

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProgressMinimized, setIsProgressMinimized] = useState(true); // Start minimized
  const cancelRequestedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { upsertItem, removeItem } = useTaskbar();

  const updateProgress = useCallback((index: number, update: Partial<DownloadProgress>) => {
    setDownloadProgress(prev =>
      prev.map((p, idx) => idx === index ? { ...p, ...update } : p)
    );
  }, []);

  const clearProgress = useCallback(() => {
    setDownloadProgress([]);
    setIsProgressMinimized(false);
    removeItem(TASKBAR_ITEM_ID);
  }, [removeItem]);

  const cancelDownloads = useCallback(() => {
    cancelRequestedRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsDownloading(false);
    setDownloadProgress([]);
    setIsProgressMinimized(false);
    removeItem(TASKBAR_ITEM_ID);
  }, [removeItem]);

  const startDownloads = useCallback(async (
    items: DownloadProgress[],
    downloadFn: (item: DownloadProgress, index: number) => Promise<void>
  ) => {
    cancelRequestedRef.current = false;
    setDownloadProgress(items);
    setIsDownloading(true);
    setIsProgressMinimized(false);
    removeItem(TASKBAR_ITEM_ID);

    // Download each item sequentially
    for (let i = 0; i < items.length; i++) {
      if (cancelRequestedRef.current) {
        break;
      }

      const item = items[i];

      // Update status to downloading
      updateProgress(i, { status: 'downloading' });

      try {
        await downloadFn(item, i);
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          console.warn(`Download cancelled for ${item.experimentId}`);
        } else {
          console.error(`Error downloading ${item.experimentId}:`, error);
          updateProgress(i, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (cancelRequestedRef.current) {
        break;
      }

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsDownloading(false);

    if (cancelRequestedRef.current) {
      cancelRequestedRef.current = false;
    }
  }, [updateProgress, removeItem]);

  // Calculate progress stats
  const progressStats = {
    completed: downloadProgress.filter(item => item.status === 'success').length,
    downloadedBytes: downloadProgress.reduce((acc, item) => acc + (item.sizeBytes ?? 0), 0),
  };

  const averageSize = progressStats.completed > 0
    ? progressStats.downloadedBytes / progressStats.completed
    : 0;
  const estimatedTotalBytes = averageSize * downloadProgress.length;
  const remainingBytes = Math.max(estimatedTotalBytes - progressStats.downloadedBytes, 0);
  const percentComplete = estimatedTotalBytes > 0
    ? Math.min((progressStats.downloadedBytes / estimatedTotalBytes) * 100, 100)
    : downloadProgress.length > 0
      ? (progressStats.completed / downloadProgress.length) * 100
      : 0;

  const hasErrors = downloadProgress.some(item => item.status === 'error');
  const allComplete = downloadProgress.length > 0 && downloadProgress.every(item => item.status === 'success');

  const handleDismissProgress = useCallback(() => {
    if (isDownloading) {
      cancelDownloads();
    } else {
      clearProgress();
    }
  }, [isDownloading, cancelDownloads, clearProgress]);

  // Update taskbar when minimized
  useEffect(() => {
    if (!isProgressMinimized) {
      removeItem(TASKBAR_ITEM_ID);
      return;
    }

    let title: string;
    let subtitle: string;
    let progressValue: number | undefined;

    if (downloadProgress.length === 0) {
      // No downloads
      title = 'Downloads';
      subtitle = 'No active downloads';
      progressValue = undefined;
    } else {
      // Active or completed downloads
      const parts: string[] = [
        `${progressStats.completed} completed`,
        `${formatBytes(progressStats.downloadedBytes) || '0 B'} downloaded`,
      ];
      if (progressStats.downloadedBytes > 0 && progressStats.completed < downloadProgress.length) {
        parts.push(
          `est. total ${formatBytes(estimatedTotalBytes)} (remaining ${formatBytes(remainingBytes)})`
        );
      }

      title = `Downloading ${downloadProgress.length} session${downloadProgress.length === 1 ? '' : 's'}`;
      subtitle = parts.join(' · ');
      progressValue = Number.isFinite(percentComplete)
        ? percentComplete / 100
        : undefined;
    }

    upsertItem({
      id: TASKBAR_ITEM_ID,
      title,
      subtitle,
      icon: isDownloading ? (
        <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      ) : (
        <Download className="h-4 w-4 text-blue-600" />
      ),
      progress: progressValue,
      status: hasErrors ? 'error' : allComplete ? 'success' : 'default',
      order: 1, // Always first
      onClick: downloadProgress.length > 0 ? () => setIsProgressMinimized(false) : undefined,
      onClose: downloadProgress.length > 0 ? handleDismissProgress : () => setIsProgressMinimized(false),
    });

    return () => {
      removeItem(TASKBAR_ITEM_ID);
    };
  }, [
    isProgressMinimized,
    downloadProgress.length,
    progressStats.completed,
    progressStats.downloadedBytes,
    estimatedTotalBytes,
    remainingBytes,
    percentComplete,
    hasErrors,
    allComplete,
    isDownloading,
    upsertItem,
    removeItem,
    handleDismissProgress,
  ]);

  const value: DownloadContextType = {
    downloadProgress,
    isDownloading,
    isProgressMinimized,
    setIsProgressMinimized,
    startDownloads,
    cancelDownloads,
    clearProgress,
    updateProgress,
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownload() {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
}
