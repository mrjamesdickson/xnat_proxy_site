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

  useEffect(() => {
    setHasError(!snapshotUrl);
  }, [snapshotUrl]);

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-md bg-gray-100 flex items-center justify-center',
        containerClassName ?? 'w-full h-40'
      )}
    >
      {snapshotUrl && !hasError ? (
        <img
          src={snapshotUrl}
          alt={alt}
          className={clsx('h-full w-full object-cover', imageClassName)}
          loading="lazy"
          onError={() => setHasError(true)}
        />
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
