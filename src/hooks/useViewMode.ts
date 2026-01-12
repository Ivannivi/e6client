import { useState, useCallback, useEffect } from 'react';

export type ViewMode = 'grid' | 'list' | 'compact';

const STORAGE_KEY = 'e6-view-mode';

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored as ViewMode) || 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, viewMode);
    } catch {
      // Storage unavailable
    }
  }, [viewMode]);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const modes: ViewMode[] = ['grid', 'list', 'compact'];
      const currentIndex = modes.indexOf(prev);
      return modes[(currentIndex + 1) % modes.length];
    });
  }, []);

  return { viewMode, setViewMode, toggleViewMode };
}
