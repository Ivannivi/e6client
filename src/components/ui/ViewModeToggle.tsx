import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ViewMode } from '../../hooks/useViewMode';
import { cn } from '../../utils';

interface Props {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const VIEW_MODES: { mode: ViewMode; icon: string; labelKey: string }[] = [
  { mode: 'grid', icon: 'fa-th', labelKey: 'viewMode.grid' },
  { mode: 'list', icon: 'fa-list', labelKey: 'viewMode.list' },
  { mode: 'compact', icon: 'fa-th-large', labelKey: 'viewMode.compact' },
];

export function ViewModeToggle({ viewMode, onChange }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [popKey, setPopKey] = useState(0);

  const updateIndicator = useCallback(() => {
    const activeBtn = btnRefs.current[viewMode];
    const container = containerRef.current;
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setIndicator({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [viewMode]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => updateIndicator());
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateIndicator]);

  return (
    <div ref={containerRef} className="relative flex rounded-full bg-surface-container p-1">
      {/* Sliding indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-full bg-secondary-container transition-all duration-300 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {VIEW_MODES.map(({ mode, icon, labelKey }) => (
        <button
          key={mode}
          ref={(el) => { btnRefs.current[mode] = el; }}
          onClick={() => { onChange(mode); setPopKey((k) => k + 1); }}
          className={cn(
            'relative z-10 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-2',
            viewMode === mode
              ? 'text-on-secondary-container'
              : 'text-on-surface-variant hover:text-on-surface'
          )}
          title={t(labelKey)}
        >
          <i
            key={viewMode === mode ? popKey : undefined}
            className={cn('fas', icon, viewMode === mode && 'animate-view-mode-pop')}
          />
          <span className="hidden sm:inline">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
