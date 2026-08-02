import type { SearchHistoryItem } from '../hooks/useSearchHistory';
import { cn } from '../utils';

interface Props {
  history: SearchHistoryItem[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  visible: boolean;
}

export function SearchHistory({ history, onSelect, onRemove, onClear, visible }: Props) {
  if (!visible || history.length === 0) return null;

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container rounded-md shadow-elevation-2 border border-outline-variant/40 overflow-hidden max-h-80 overflow-y-auto z-50">
      <div className="flex justify-between items-center px-4 py-2 bg-surface-container-high border-b border-outline-variant/40">
        <span className="text-xs font-bold text-on-surface-variant uppercase">
          <i className="fas fa-history mr-2" />
          Recent Searches
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-xs text-error hover:underline font-medium"
        >
          Clear All
        </button>
      </div>
      {history.map((item) => (
        <div
          key={item.query}
          className="flex items-center justify-between px-4 py-2 hover:bg-surface-container-high cursor-pointer group"
          onClick={() => onSelect(item.query)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <i className="fas fa-search text-on-surface-variant text-sm" />
            <span className="font-medium text-on-surface truncate">{item.query}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant">{formatTime(item.timestamp)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.query);
              }}
              className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1"
            >
              <i className="fas fa-times text-sm" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
