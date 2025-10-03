import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Image as ImageIcon } from 'lucide-react';

interface ScanSnapshotProps {
  snapshotUrl?: string | null;
  alt: string;
  containerClassName?: string;
  imageClassName?: string;
  iconClassName?: string;
  showLabel?: boolean;
}

export function ScanSnapshot({
  snapshotUrl,
  alt,
  containerClassName,
  imageClassName,
  iconClassName,
  showLabel = false,
}: ScanSnapshotProps) {
  const [hasError, setHasError] = useState(!snapshotUrl);
  const [isLoading, setIsLoading] = useState(!!snapshotUrl);

  useEffect(() => {
    setHasError(!snapshotUrl);
    setIsLoading(!!snapshotUrl);
    if (snapshotUrl) {
      console.log('📸 Scan snapshot URL:', snapshotUrl);
    }
  }, [snapshotUrl]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('❌ Snapshot failed to load:', {
      url: snapshotUrl,
      error: e,
      naturalWidth: (e.target as HTMLImageElement).naturalWidth,
      naturalHeight: (e.target as HTMLImageElement).naturalHeight
    });
    setHasError(true);
    setIsLoading(false);
  };

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-md bg-gray-100 flex items-center justify-center',
        containerClassName ?? 'w-full h-40'
      )}
    >
      {snapshotUrl && !hasError ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          )}
          <img
            src={snapshotUrl}
            alt={alt}
            className={clsx('h-full w-full object-cover', imageClassName, isLoading && 'opacity-0')}
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-400">
          <ImageIcon className={clsx('h-10 w-10', iconClassName)} />
          {showLabel && (
            <span className="mt-2 text-xs font-medium">Snapshot unavailable</span>
          )}
        </div>
      )}
    </div>
  );
}
