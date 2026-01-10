import type { ViewMode } from '../hooks/useViewMode';
import { cn } from '../utils';

interface Props {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const VIEW_MODES: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: 'grid', icon: 'fa-th', label: 'Grid' },
  { mode: 'list', icon: 'fa-list', label: 'List' },
  { mode: 'compact', icon: 'fa-th-large', label: 'Compact' },
];

export function ViewModeToggle({ viewMode, onChange }: Props) {
  return (
    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
      {VIEW_MODES.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
            viewMode === mode
              ? 'bg-white dark:bg-gray-600 text-e6-base dark:text-e6-light shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
          title={label}
        >
          <i className={`fas ${icon}`} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
