import { cn } from '../utils';

interface Props {
  onRandom: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function QuickActions({ onRandom, onRefresh, loading }: Props) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onRandom}
        disabled={loading}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
          'hover:from-purple-600 hover:to-pink-600',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'shadow-md hover:shadow-lg'
        )}
        title="Random Post (X)"
      >
        <i className="fas fa-random" />
      </button>
      <button
        onClick={onRefresh}
        disabled={loading}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
          'hover:bg-gray-200 dark:hover:bg-gray-600',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Refresh (R)"
      >
        <i className={cn('fas fa-sync-alt', loading && 'animate-spin')} />
      </button>
    </div>
  );
}
