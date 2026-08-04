import { useCallback, useEffect, useRef, useState, type RefObject, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils';

const PULL_THRESHOLD = 80;
const RESISTANCE = 0.45;

interface UsePullToRefreshResult {
  ref: RefObject<HTMLDivElement | null>;
  isRefreshing: boolean;
  indicator: ReactNode;
}

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  enabled = true
): UsePullToRefreshResult {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    const container = ref.current;
    if (!container || !enabled) return;
    const scrolled = container.scrollTop > 0 || (window.scrollY ?? 0) > 0;
    if (scrolled) return;

    startYRef.current = e.clientY;
    isPullingRef.current = true;
  }, [enabled]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isPullingRef.current || startYRef.current === null) return;

    const delta = e.clientY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    setPullDistance(Math.min(delta * RESISTANCE, PULL_THRESHOLD * 1.5));
  }, []);

  const finishPull = useCallback(async () => {
    startYRef.current = null;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const handlePointerUp = useCallback(() => {
    void finishPull();
  }, [finishPull]);

  const handlePointerCancel = useCallback(() => {
    setPullDistance(0);
    startYRef.current = null;
    isPullingRef.current = false;
  }, []);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);

  const indicator = (
    <div
      className={cn(
        'absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden transition-transform duration-200 pointer-events-none z-20',
        pullDistance > 0 && 'bg-surface-container border-b border-outline-variant/40'
      )}
      style={{
        height: `${Math.max(pullDistance, isRefreshing ? PULL_THRESHOLD : 0)}px`,
        transform: `translateY(${pullDistance}px)`,
      }}
    >
      <div className="flex flex-col items-center text-on-surface-variant">
        <i
          className={cn(
            'fas fa-arrow-down text-lg transition-transform duration-200',
            pullDistance >= PULL_THRESHOLD && 'rotate-180'
          )}
        />
        <span className="text-xs mt-1">
          {isRefreshing
            ? t('pullToRefresh.refreshing')
            : pullDistance >= PULL_THRESHOLD
              ? t('pullToRefresh.release')
              : t('pullToRefresh.pull')}
        </span>
      </div>
    </div>
  );

  return { ref, isRefreshing, indicator };
}
