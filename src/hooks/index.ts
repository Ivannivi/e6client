import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { APP_CONFIG } from '../config';

export { useSearchHistory } from './useSearchHistory';
export { useKeyboardShortcuts, SHORTCUT_DESCRIPTIONS } from './useKeyboardShortcuts';
export { useToast } from './useToast';
export { useViewMode } from './useViewMode';
export { useAppLock } from './useAppLock';
export { useSecureAppSwitcher } from './useSecureAppSwitcher';
export { useDeepLinks } from './useDeepLinks';
export { useOfflineCache } from './useOfflineCache';
export { usePullToRefresh } from './usePullToRefresh';
export type { ViewMode } from './useViewMode';
export type { Toast } from './useToast';

export function useDebounce<T>(value: T, delay = APP_CONFIG.ui.debounceDelay): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useColumnCount(): number {
  const [columns, setColumns] = useState(2);
  const { breakpoints } = APP_CONFIG.ui;

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= breakpoints.xl) setColumns(5);
      else if (width >= breakpoints.lg) setColumns(4);
      else if (width >= breakpoints.md) setColumns(3);
      else setColumns(2);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [breakpoints]);

  return columns;
}

export function useIntersectionObserver(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  options: { threshold?: number; rootMargin?: string } = {}
): void {
  const { threshold = 0.1, rootMargin = '400px' } = options;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) callback();
      },
      { threshold, rootMargin }
    );

    const element = ref.current;
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [ref, callback, threshold, rootMargin]);
}
