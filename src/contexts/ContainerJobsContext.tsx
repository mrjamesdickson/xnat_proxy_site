import { createContext, useContext, useState, ReactNode } from 'react';

interface ContainerJobsContextType {
  isWidgetOpen: boolean;
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
}

const ContainerJobsContext = createContext<ContainerJobsContextType | undefined>(undefined);

export function ContainerJobsProvider({ children }: { children: ReactNode }) {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  const openWidget = () => setIsWidgetOpen(true);
  const closeWidget = () => setIsWidgetOpen(false);
  const toggleWidget = () => setIsWidgetOpen(prev => !prev);

  return (
    <ContainerJobsContext.Provider value={{ isWidgetOpen, openWidget, closeWidget, toggleWidget }}>
      {children}
    </ContainerJobsContext.Provider>
  );
}

export function useContainerJobs() {
  const context = useContext(ContainerJobsContext);
  if (context === undefined) {
    throw new Error('useContainerJobs must be used within a ContainerJobsProvider');
  }
  return context;
}
