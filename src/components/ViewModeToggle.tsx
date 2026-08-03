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
    <div className="flex rounded-full bg-surface-container p-1">
      {VIEW_MODES.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
            viewMode === mode
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:text-on-surface'
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
