import { useTranslation } from 'react-i18next';
import type { ViewMode } from '../hooks/useViewMode';
import { cn } from '../utils';

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
  return (
    <div className="flex rounded-full bg-surface-container p-1">
      {VIEW_MODES.map(({ mode, icon, labelKey }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
            viewMode === mode
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:text-on-surface'
          )}
          title={t(labelKey)}
        >
          <i className={`fas ${icon}`} />
          <span className="hidden sm:inline">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
