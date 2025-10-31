import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type TaskbarItemStatus = 'default' | 'success' | 'error';

export interface TaskbarItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  progress?: number; // value between 0 and 1
  status?: TaskbarItemStatus;
  order?: number; // sort order (lower number = left position)
  onClick?: () => void;
  onClose?: () => void;
}

interface TaskbarContextValue {
  items: TaskbarItem[];
  upsertItem: (item: TaskbarItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

const TaskbarContext = createContext<TaskbarContextValue | undefined>(undefined);

export function TaskbarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TaskbarItem[]>([]);

  const upsertItem = useCallback((item: TaskbarItem) => {
    setItems((previous) => {
      const index = previous.findIndex((existing) => existing.id === item.id);
      if (index === -1) {
        return [...previous, item];
      }

      const next = [...previous];
      next[index] = { ...next[index], ...item };
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<TaskbarContextValue>(
    () => ({
      items,
      upsertItem,
      removeItem,
      clear,
    }),
    [items, upsertItem, removeItem, clear]
  );

  return <TaskbarContext.Provider value={value}>{children}</TaskbarContext.Provider>;
}

export function useTaskbar(): TaskbarContextValue {
  const context = useContext(TaskbarContext);
  if (!context) {
    throw new Error('useTaskbar must be used within a TaskbarProvider');
  }
  return context;
}
