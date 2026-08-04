import { useCallback } from 'react';
import type { Settings } from '../types';

export type ViewMode = 'grid' | 'list' | 'compact';

const MODES: ViewMode[] = ['grid', 'list', 'compact'];

export function useViewMode(
  settings: Settings,
  updateSettings: (patch: Partial<Settings>) => void
) {
  const viewMode = settings.viewMode;

  const setViewMode = useCallback((mode: ViewMode) => {
    updateSettings({ viewMode: mode });
  }, [updateSettings]);

  const toggleViewMode = useCallback(() => {
    const currentIndex = MODES.indexOf(viewMode);
    updateSettings({ viewMode: MODES[(currentIndex + 1) % MODES.length] });
  }, [viewMode, updateSettings]);

  return { viewMode, setViewMode, toggleViewMode };
}
