import { Maximize2, X } from 'lucide-react';
import clsx from 'clsx';
import { useTaskbar } from '../contexts/TaskbarContext';

export function Taskbar() {
  const { items } = useTaskbar();

  if (!items.length) {
    return null;
  }

  // Sort items by order (lower number first), then by id as fallback
  const sortedItems = [...items].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] pointer-events-none">
      <div className="mx-auto mb-4 flex max-w-5xl flex-wrap flex-row-reverse justify-end gap-3 px-4 pointer-events-auto">
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className="flex min-w-[220px] max-w-xs flex-1 items-center gap-3 rounded-lg border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
          >
            {item.icon && <div className="text-blue-600 dark:text-blue-400">{item.icon}</div>}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
              {item.subtitle && (
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</p>
              )}
              {typeof item.progress === 'number' && (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                  <div
                    className={clsx('h-full transition-all duration-300', {
                      'bg-red-500 dark:bg-red-400': item.status === 'error',
                      'bg-green-500 dark:bg-green-400': item.status === 'success',
                      'bg-blue-500 dark:bg-blue-400': !item.status || item.status === 'default',
                    })}
                    style={{ width: `${Math.max(Math.min(item.progress * 100, 100), 0)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {item.onClick && (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-slate-800 dark:hover:text-gray-300"
                  aria-label="Restore"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
              {item.onClose && (
                <button
                  type="button"
                  onClick={item.onClose}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-slate-800 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
